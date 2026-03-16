"""API routes for thermal comfort calculations."""

from fastapi import APIRouter, Query

from app.schemas import DiscomfortIndexResponse, HeatIndexResponse, PmvPpdResponse
from app.services.service_thermal_comfort import (
    calc_discomfort_index,
    calc_heat_index,
    calc_pmv_ppd,
    pmv_to_comfort_state,
)

router = APIRouter(prefix="/thermal-comfort", tags=["thermal-comfort"])


@router.get(
    "/discomfort-index",
    response_model=DiscomfortIndexResponse,
)
def get_discomfort_index(
    tdb: float = Query(..., description="Dry bulb air temperature [°C]"),
    rh: float = Query(..., ge=0, le=100, description="Relative humidity [%]"),
):
    """
    Compute the Discomfort Index (DI) for the given mean air temperature and relative humidity.

    Returns the DI value in °C and the discomfort category for the selected time period.
    """
    di_val, discomfort_condition = calc_discomfort_index(tdb=tdb, rh=rh)
    return DiscomfortIndexResponse(di=di_val, discomfort_condition=discomfort_condition)


@router.get(
    "/heat-index",
    response_model=HeatIndexResponse,
)
def get_heat_index(
    tdb: float = Query(..., description="Dry bulb air temperature [°C]"),
    rh: float = Query(..., ge=0, le=100, description="Relative humidity [%]"),
):
    """
    Compute the Heat Index (HI) for the given mean air temperature and relative humidity.

    Uses the Lu and Romps (2022) model. Returns the apparent temperature in °C.
    """
    hi_val = calc_heat_index(tdb=tdb, rh=rh)
    return HeatIndexResponse(hi=hi_val)


@router.get(
    "/pmv-ppd",
    response_model=PmvPpdResponse,
)
def get_pmv_ppd(
    tdb: float = Query(..., description="Dry bulb air temperature [°C]"),
    rh: float = Query(..., ge=0, le=100, description="Relative humidity [%]"),
):
    """
    Compute PMV and PPD (ASHRAE 55) for the given mean air temperature and relative humidity.

    Uses fixed values: mean radiant temperature = air temperature, vr=0.1 m/s, met=1, clo=1.0.
    Returns Predicted Mean Vote (PMV), Predicted Percentage Dissatisfied (PPD), compliance, and comfort state.
    """
    pmv_val, ppd_val, compliance = calc_pmv_ppd(tdb=tdb, rh=rh)
    comfort_state = pmv_to_comfort_state(pmv_val)
    return PmvPpdResponse(
        pmv=pmv_val,
        ppd=ppd_val,
        compliance=compliance,
        comfort_state=comfort_state,
    )
