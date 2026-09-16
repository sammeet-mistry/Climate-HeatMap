from decimal import Decimal

import pytest

from backend.risk_engine.services.risk_calculator import (
    calculate_duration_score,
    calculate_humidity_score,
    calculate_temperature_score,
    calculate_uv_score,
    clamp,
    determine_risk_level,
    generate_recommendation,
    RiskAssessment,
    RiskRule,
)


class TestHeatRiskCalculator:

    def test_temperature_below_27_returns_low_score(self):
        result = calculate_temperature_score(26)
        assert result == Decimal("1.00")

    def test_temperature_above_41_returns_maximum_score(self):
        result = calculate_temperature_score(42)
        assert result == Decimal("10.00")

    def test_high_humidity_score(self):
        result = calculate_humidity_score(80)
        assert result == Decimal("9.00")

    def test_extreme_uv_score(self):
        result = calculate_uv_score(11)
        assert result == Decimal("10.00")

    def test_short_duration_score(self):
        result = calculate_duration_score(1)
        assert result == Decimal("2.00")

    def test_long_duration_score(self):
        result = calculate_duration_score(6)
        assert result == Decimal("9.00")

    def test_clamp_above_ten(self):
        result = clamp(15)
        assert result == Decimal("10")

    def test_clamp_negative(self):
        result = clamp(-5)
        assert result == Decimal("0")

    def test_clamp_valid_value(self):
        result = clamp(5)
        assert result == Decimal("5")

    def test_high_risk_recommendation(self):
        result = generate_recommendation(
            RiskAssessment.RiskLevel.HIGH
        )
        assert "Rescheduling" in result

    def test_low_risk_level(self):
        rule = RiskRule(
            name="Mutation Test Rule",
            low_max=Decimal("3.90"),
            moderate_max=Decimal("5.90"),
            high_max=Decimal("7.90"),
        )

        result = determine_risk_level(
            Decimal("3.20"),
            rule,
        )

        assert result == RiskAssessment.RiskLevel.LOW

    def test_very_high_risk_level(self):
        rule = RiskRule(
            name="Mutation Test Rule",
            low_max=Decimal("3.90"),
            moderate_max=Decimal("5.90"),
            high_max=Decimal("7.90"),
        )

        result = determine_risk_level(
            Decimal("8.50"),
            rule,
        )

        assert result == RiskAssessment.RiskLevel.VERY_HIGH