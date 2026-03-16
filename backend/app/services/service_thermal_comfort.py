"""Thermal comfort calculations using pythermalcomfort."""

from pythermalcomfort.models import discomfort_index
from pythermalcomfort.models import heat_index_lu
from pythermalcomfort.models import pmv_ppd_ashrae


def pmv_to_comfort_state(pmv: float) -> str:
    """
    Map PMV (Predicted Mean Vote) to a thermal comfort state label.

    - PMV in [-0.5, +0.5] -> comfortable
    - PMV in [-1.5, -0.5) or (0.5, 1.5] -> slight discomfort
    - Else -> discomfort

    Parameters
    ----------
    pmv : float
        Predicted Mean Vote from ASHRAE 55 PMV/PPD.

    Returns
    -------
    str
        One of "comfortable", "slight discomfort", "discomfort".
    """
    if -0.5 <= pmv <= 0.5:
        return "comfortable"
    if -1.5 <= pmv < -0.5 or 0.5 < pmv <= 1.5:
        return "slight discomfort"
    return "discomfort"


def calc_discomfort_index(tdb: float, rh: float) -> tuple[float, str]:
    """
    Calculate the Discomfort Index (DI) from mean air temperature and relative humidity.

    The index is an effective temperature based on air temperature and humidity,
    with six discomfort categories for warm environments.

    Parameters
    ----------
    tdb : float
        Dry bulb air temperature, [°C].
    rh : float
        Relative humidity, [%].

    Returns
    -------
    tuple[float, str]
        (di, discomfort_condition) where di is the index value in °C and
        discomfort_condition is the category description.
    """
    result = discomfort_index(tdb=tdb, rh=rh)
    di_val = result.di
    condition = result.discomfort_condition
    if isinstance(di_val, list):
        di_val = di_val[0]
    if isinstance(condition, list):
        condition = condition[0]
    return float(di_val), str(condition)


def calc_heat_index(tdb: float, rh: float, round_output: bool = False) -> float:
    """
    Calculate the Heat Index (HI) from mean air temperature and relative humidity.

    Uses the Lu and Romps (2022) model, which extends the validity range of
    Steadman's apparent temperature to extreme conditions.

    Parameters
    ----------
    tdb : float
        Dry bulb air temperature, [°C].
    rh : float
        Relative humidity, [%].
    round_output : bool, optional
        If True, round the result. Default False for API consistency.

    Returns
    -------
    float
        Heat Index in °C (apparent temperature).
    """
    result = heat_index_lu(tdb=tdb, rh=rh, round_output=round_output)
    hi_val = result.hi
    if isinstance(hi_val, list):
        hi_val = hi_val[0]
    return float(hi_val)


def calc_pmv_ppd(tdb: float, rh: float, round_output: bool = False) -> tuple[float, float, bool]:
    """
    Calculate PMV and PPD (ASHRAE 55) from air temperature and relative humidity.

    Uses fixed assumptions: tr=tdb, vr=0.1 m/s, met=1, clo=1.0 (model 55-2023).

    Parameters
    ----------
    tdb : float
        Dry bulb air temperature, [°C].
    rh : float
        Relative humidity, [%].
    round_output : bool, optional
        If True, round PMV/PPD. Default False for API consistency.

    Returns
    -------
    tuple[float, float, bool]
        (pmv, ppd, compliance).
    """
    result = pmv_ppd_ashrae(
        tdb=tdb,
        tr=tdb,
        vr=0.1,
        rh=rh,
        met=1.0,
        clo=1.0,
        model="55-2023",
        round_output=round_output,
    )
    pmv_val = result.pmv
    ppd_val = result.ppd
    compliance = result.compliance
    if isinstance(pmv_val, list):
        pmv_val = pmv_val[0]
    if isinstance(ppd_val, list):
        ppd_val = ppd_val[0]
    if isinstance(compliance, list):
        compliance = compliance[0]
    return float(pmv_val), float(ppd_val), bool(compliance)
