from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    gemini_api_key: str = ""
    openf1_base_url: str = "https://api.openf1.org/v1"
    gemini_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"


settings = Settings()
