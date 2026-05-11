import path from "path";
import fs from "fs"

const useDeviceId = () => {
  const machineConfigPath = path.join("C:\\Users\\YY", "machine-config.json");
  if (!fs.existsSync(machineConfigPath)) {
    console.error(`:x: Config file not found: ${machineConfigPath}`);
    console.error(
      'Please create machine-config.json with: { "deviceId": "RVM-XXXX" }'
    );
    process.exit(1);
  }

  const machineConfig = JSON.parse(fs.readFileSync(machineConfigPath, "utf8"));
  const DEVICE_ID = machineConfig.deviceId;
  return DEVICE_ID;
};

export default useDeviceId;
