from fastapi import FastAPI
from app.routes import user

app = FastAPI(
    title="API Magistral",
    description="Backend FastAPI du projet PFE",
    version="1.0.0"
)

app.include_router(user.router)

@app.get("/")
def root():
    return {"message": "API is running"}