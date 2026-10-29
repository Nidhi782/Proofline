import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


class PolicyEngine:
    """Evaluates domain-specific access policies against ZKP public signals."""

    def __init__(self, default_policies_file: str | None = None) -> None:
        self.default_policies_file = default_policies_file or settings.DEFAULT_POLICIES_PATH
        self.default_policies: dict[str, dict[str, Any]] = self._load_default_policies()

    def _load_default_policies(self) -> dict[str, dict[str, Any]]:
        """Load default domain policies from JSON file."""
        file_path = Path(self.default_policies_file)
        if not file_path.exists():
            # Fallback path if running from another directory
            file_path = Path(__file__).resolve().parent / "default_policies.json"

        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Failed to load default policies from %s: %s", file_path, e)

        return {}

    def get_default_policy(self, domain: str) -> dict[str, Any] | None:
        """Fetch the default policy for a domain."""
        return self.default_policies.get(domain.lower())

    def validate_policy_format(self, policy: dict[str, Any]) -> tuple[bool, str]:
        """Validate structure and syntax of an access policy dictionary."""
        if not isinstance(policy, dict):
            return False, "Policy must be a JSON object"
        if "domain" not in policy or not isinstance(policy["domain"], str):
            return False, "Policy must specify a valid 'domain' string"
        if "predicates" not in policy or not isinstance(policy["predicates"], list):
            return False, "Policy must specify a 'predicates' list"

        allowed_types = {"age_gte", "org_member", "trust_score_gte", "has_qualification"}
        for idx, pred in enumerate(policy["predicates"]):
            if not isinstance(pred, dict):
                return False, f"Predicate at index {idx} must be an object"
            p_type = pred.get("type")
            if p_type not in allowed_types:
                return (
                    False,
                    f"Unknown predicate type '{p_type}' at index {idx}. Allowed: {sorted(allowed_types)}",
                )
            if p_type == "age_gte" and "threshold" not in pred:
                return False, f"Predicate 'age_gte' at index {idx} missing 'threshold'"
            if p_type == "org_member" and "merkle_root" not in pred:
                return False, f"Predicate 'org_member' at index {idx} missing 'merkle_root'"
            if p_type == "trust_score_gte" and "threshold" not in pred:
                return False, f"Predicate 'trust_score_gte' at index {idx} missing 'threshold'"
            if p_type == "has_qualification" and "qualification_code" not in pred:
                return False, f"Predicate 'has_qualification' at index {idx} missing 'qualification_code'"

        return True, "Policy format is valid"

    def evaluate(
        self,
        policy: dict[str, Any],
        public_signals: list[str],
    ) -> tuple[bool, str]:
        """
        Evaluate domain policy predicates against the proof's public signals.

        Public signals can carry either:
        1. Explicit values (e.g. ['21', '0x1a2b...', '0.85', 'SEC_OPS'])
        2. Cryptographic satisfaction flags ('1' indicating Circom constraint satisfied)
        3. Merkle roots or signal hashes
        """
        if not policy:
            return False, "Empty or undefined access policy"

        predicates = policy.get("predicates", [])
        if not predicates:
            return True, "Policy has no predicates; access granted by default"

        string_signals = [str(s).strip() for s in public_signals]

        for pred in predicates:
            p_type = pred.get("type")

            if p_type == "age_gte":
                threshold = float(pred.get("threshold", 0))
                passed = False
                for s in string_signals:
                    try:
                        val = float(s)
                        if val >= threshold:
                            passed = True
                            break
                    except ValueError:
                        continue
                # If ZK circuit outputs satisfaction flag (1), or explicit age >= threshold
                if not passed and "1" in string_signals:
                    passed = True

                if not passed:
                    return (
                        False,
                        f"Predicate 'age_gte' failed: threshold {threshold} not satisfied by signals",
                    )

            elif p_type == "org_member":
                expected_root = str(pred.get("merkle_root", "")).lower()
                passed = False
                for s in string_signals:
                    s_lower = s.lower()
                    if s_lower == expected_root:
                        passed = True
                        break
                    # Also check hash of string signal
                    if "0x" + hashlib.sha256(s.encode()).hexdigest() == expected_root:
                        passed = True
                        break
                # If ZK circuit outputs membership verification flag (1)
                if not passed and "1" in string_signals:
                    passed = True

                if not passed:
                    return (
                        False,
                        f"Predicate 'org_member' failed: root {expected_root} not found in public signals",
                    )

            elif p_type == "trust_score_gte":
                threshold = float(pred.get("threshold", 0.0))
                passed = False
                for s in string_signals:
                    try:
                        val = float(s)
                        # Support both 0.0-1.0 and 0-100 scales
                        if val > 1.0 and threshold <= 1.0:
                            val = val / 100.0
                        if val >= threshold:
                            passed = True
                            break
                    except ValueError:
                        continue
                if not passed and "1" in string_signals:
                    passed = True

                if not passed:
                    return (
                        False,
                        f"Predicate 'trust_score_gte' failed: threshold {threshold} not satisfied",
                    )

            elif p_type == "has_qualification":
                expected_code = str(pred.get("qualification_code", "")).strip().upper()
                passed = False
                for s in string_signals:
                    if s.upper() == expected_code:
                        passed = True
                        break
                    # Check numeric or hex representation of qualification code
                    code_hex = "0x" + expected_code.encode("utf-8").hex()
                    if s.lower() == code_hex.lower():
                        passed = True
                        break
                if not passed and "1" in string_signals:
                    passed = True

                if not passed:
                    return (
                        False,
                        f"Predicate 'has_qualification' failed: missing qualification '{expected_code}'",
                    )

        return True, "All policy predicates successfully satisfied"


policy_engine = PolicyEngine()
