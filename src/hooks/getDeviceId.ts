import path from "path";
import fs from "fs";

const getDeviceId = (): string => {
  const machineConfigPath = path.join(
    "/home/interakt02/RVMId",
    "rvmId.json"
  );

  if (!fs.existsSync(machineConfigPath)) {
    console.error(`❌ Config file not found: ${machineConfigPath}`);
    return "UNKNOWN";
  }

  const machineConfig = JSON.parse(
    fs.readFileSync(machineConfigPath, "utf8")
  );

  return machineConfig.deviceId;
};

export default getDeviceId;