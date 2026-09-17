import sys
import os
from pathlib import Path
import uvicorn

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend-main"

# Add backend directory to Python path
sys.path.insert(0, str(BACKEND_DIR))

# Change current working directory to backend directory
os.chdir(str(BACKEND_DIR))

if __name__ == "__main__":
    print("=" * 60)
    print(" FlowBase Application Server")
    print("=" * 60)
    print(" Frontend & Backend running on: http://127.0.0.1:8000")
    print(" API Documentation:             http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
