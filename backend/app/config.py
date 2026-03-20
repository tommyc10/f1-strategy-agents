from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    groq_api_key: str = ""
    openf1_base_url: str = "https://api.openf1.org/v1"
    groq_model: str = "llama-3.3-70b-versatile"


settings = Settings()
