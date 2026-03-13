import MultiLineChart from "@/components/MultiLineChart";

export default function SimulationCharts({
  heatingDieselChart,
  facilityElectricityChart,
  meanAirTemperatureChart,
}) {
  const hasCharts =
    heatingDieselChart.data.length > 0 ||
    facilityElectricityChart.data.length > 0 ||
    meanAirTemperatureChart.data.length > 0;

  if (!hasCharts) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-6">
      {heatingDieselChart.data.length > 0 && (
        <MultiLineChart
          title="Daily Heating Diesel by Room"
          data={heatingDieselChart.data}
          series={heatingDieselChart.series}
          unit="L"
          decimals={2}
        />
      )}
      {facilityElectricityChart.data.length > 0 && (
        <MultiLineChart
          title="Daily Facility Electricity by Room"
          data={facilityElectricityChart.data}
          series={facilityElectricityChart.series}
          unit="kWh"
          decimals={2}
        />
      )}
      {meanAirTemperatureChart.data.length > 0 && (
        <MultiLineChart
          title="Daily Mean Air Temperature by Room"
          data={meanAirTemperatureChart.data}
          series={meanAirTemperatureChart.series}
          unit="°C"
          decimals={2}
        />
      )}
    </div>
  );
}
