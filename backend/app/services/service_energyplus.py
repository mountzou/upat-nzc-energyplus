from pathlib import Path
import subprocess

from app.config import ENERGYPLUS_EXE

# Executes an EnergyPlus simulation using the specified IDF file, weather file, and output directory.
def execute_energyplus(idf_path: str, weather_path: str, output_dir: str):
    idf_path = Path(idf_path)
    weather_path = Path(weather_path)
    output_dir = Path(output_dir)

    cmd = [
        str(ENERGYPLUS_EXE),
        "-w",
        str(weather_path),
        "-d",
        str(output_dir),
        str(idf_path),
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(output_dir),
    )

    return {
        "command": cmd,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "success": result.returncode == 0,
        "expected_outputs": {
            "err": str(output_dir / "eplusout.err"),
            "eso": str(output_dir / "eplusout.eso"),
            "csv": str(output_dir / "eplusout.csv"),
            "sql": str(output_dir / "eplusout.sql"),
        },
    }