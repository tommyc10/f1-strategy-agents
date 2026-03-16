"""Sample OpenF1 API responses for offline testing."""

MOCK_SESSION = {
    "session_key": 9558,
    "session_name": "Race",
    "session_type": "Race",
    "date_start": "2024-03-02T15:00:00",
    "circuit_short_name": "Bahrain",
}

MOCK_POSITIONS = [
    {"driver_number": 1, "position": 1, "date": "2024-03-02T15:30:00"},
    {"driver_number": 4, "position": 2, "date": "2024-03-02T15:30:00"},
    {"driver_number": 16, "position": 3, "date": "2024-03-02T15:30:00"},
]

MOCK_DRIVERS = [
    {"driver_number": 1, "full_name": "Max Verstappen", "name_acronym": "VER", "team_name": "Red Bull Racing"},
    {"driver_number": 4, "full_name": "Lando Norris", "name_acronym": "NOR", "team_name": "McLaren"},
    {"driver_number": 16, "full_name": "Charles Leclerc", "name_acronym": "LEC", "team_name": "Ferrari"},
]

MOCK_STINTS = [
    {"driver_number": 1, "compound": "SOFT", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": 18, "stint_number": 1},
    {"driver_number": 4, "compound": "MEDIUM", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": 22, "stint_number": 1},
    {"driver_number": 4, "compound": "MEDIUM", "tyre_age_at_start": 0, "lap_start": 1, "lap_end": None, "stint_number": 2},
]

MOCK_LAPS = [
    {"driver_number": 4, "lap_number": 33, "lap_duration": 81.234},
    {"driver_number": 4, "lap_number": 34, "lap_duration": 81.567},
    {"driver_number": 1, "lap_number": 34, "lap_duration": 80.890},
]

MOCK_WEATHER = [
    {"air_temperature": 28.0, "track_temperature": 42.0, "rainfall": 0, "date": "2024-03-02T15:30:00"},
]

MOCK_INTERVALS = [
    {"driver_number": 1, "gap_to_leader": 0.0, "interval": 0.0},
    {"driver_number": 4, "gap_to_leader": 1.2, "interval": 1.2},
    {"driver_number": 16, "gap_to_leader": 3.4, "interval": 2.2},
]

MOCK_SECTORS = [
    {"driver_number": 1, "lap_number": 34, "sector_number": 1, "sector_duration": 26500},  # 26.5s
    {"driver_number": 1, "lap_number": 34, "sector_number": 2, "sector_duration": 27200},  # 27.2s
    {"driver_number": 1, "lap_number": 34, "sector_number": 3, "sector_duration": 27190},  # 27.19s
    {"driver_number": 4, "lap_number": 34, "sector_number": 1, "sector_duration": 27100},  # 27.1s
    {"driver_number": 4, "lap_number": 34, "sector_number": 2, "sector_duration": 27300},  # 27.3s
    {"driver_number": 4, "lap_number": 34, "sector_number": 3, "sector_duration": 27167},  # 27.167s
]
