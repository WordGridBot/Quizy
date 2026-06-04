import os
import uvicorn
from dotenv import load_dotenv

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
# Load env variables from Next.js env.local file (located one folder up)
dotenv_path = os.path.join(script_dir, "..", ".env.local")
load_dotenv(dotenv_path=dotenv_path)

# Set the API_SECRET as "Japu" since that's what the user specified
os.environ["API_SECRET"] = "Japu"

if __name__ == "__main__":
    print("Starting local FastAPI backend on port 7860...")
    print("Resolved .env.local path:", dotenv_path)
    print("MongoDB URI loaded:", bool(os.environ.get("MONGODB_URI")))
    print("NVIDIA API Key loaded:", bool(os.environ.get("NVIDIA_API_KEY")))
    print("API Secret set to 'Japu'")
    
    # Change working directory to script directory so uvicorn can find main:app
    os.chdir(script_dir)
    uvicorn.run("main:app", host="127.0.0.1", port=7860, reload=True)
