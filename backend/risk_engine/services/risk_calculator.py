from decimal import Decimal, ROUND_HALF_UP


def _to_decimal(value, quantize=True):
	d = Decimal(value)
	if quantize:
		return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
	return d


def clamp(value):
	d = Decimal(value)
	if d < 0:
		return Decimal("0")
	if d > 10:
		return Decimal("10")
	# return integer-like Decimals without trailing .00 when appropriate
	if d == d.to_integral():
		return Decimal(int(d))
	return _to_decimal(d)


def calculate_temperature_score(temp_celsius: float) -> Decimal:
	if temp_celsius < 27:
		return Decimal("1.00")
	if temp_celsius > 41:
		return Decimal("10.00")
	# linear interpolation between 27 -> 1 and 41 -> 10
	ratio = (temp_celsius - 27) / (41 - 27)
	score = 1 + ratio * (10 - 1)
	return _to_decimal(score)


def calculate_humidity_score(humidity_percent: float) -> Decimal:
	if humidity_percent >= 80:
		return Decimal("9.00")
	if humidity_percent <= 20:
		return Decimal("1.00")
	# linear approx between 20->1 and 80->9
	ratio = (humidity_percent - 20) / (80 - 20)
	score = 1 + ratio * (9 - 1)
	return _to_decimal(score)


def calculate_uv_score(uv_index: float) -> Decimal:
	if uv_index > 10:
		return Decimal("10.00")
	if uv_index <= 0:
		return Decimal("0.00")
	# scale 0..10 to 0..10 linearly
	score = min(max(uv_index, 0), 10)
	return _to_decimal(score)


def calculate_duration_score(duration_hours: float) -> Decimal:
	if duration_hours <= 1:
		return Decimal("2.00")
	if duration_hours >= 6:
		return Decimal("9.00")
	# linear between 1->2 and 6->9
	ratio = (duration_hours - 1) / (6 - 1)
	score = 2 + ratio * (9 - 2)
	return _to_decimal(score)


class RiskAssessment:
	class RiskLevel:
		LOW = "low"
		MODERATE = "moderate"
		HIGH = "high"
		VERY_HIGH = "very_high"


class RiskRule:
	def __init__(self, name: str, low_max: Decimal, moderate_max: Decimal, high_max: Decimal):
		self.name = name
		self.low_max = Decimal(low_max)
		self.moderate_max = Decimal(moderate_max)
		self.high_max = Decimal(high_max)


def determine_risk_level(score: Decimal, rule: RiskRule) -> str:
	s = Decimal(score)
	if s <= rule.low_max:
		return RiskAssessment.RiskLevel.LOW
	if s <= rule.moderate_max:
		return RiskAssessment.RiskLevel.MODERATE
	if s <= rule.high_max:
		return RiskAssessment.RiskLevel.HIGH
	return RiskAssessment.RiskLevel.VERY_HIGH


def generate_recommendation(risk_level: str) -> str:
	if risk_level == RiskAssessment.RiskLevel.HIGH:
		return "Rescheduling recommended for vulnerable workers and rescheduling activities." \
			   "Use shade and hydration."
	if risk_level == RiskAssessment.RiskLevel.VERY_HIGH:
		return "Evacuate outdoor activity; immediate cooling and medical support."
	return "Standard precautions: hydration and rest breaks."
