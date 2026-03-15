from enum import StrEnum


class TyreCompound(StrEnum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


class Recommendation(StrEnum):
    PIT = "PIT"
    STAY_OUT = "STAY_OUT"
    OPPOSITE = "OPPOSITE"
    FLEXIBLE = "FLEXIBLE"


class Confidence(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
