export function formatCameraDisplayLabel(cameraName?: string | null, sensorSize?: string | null) {
  const normalizedCameraName = cameraName?.trim() || '';
  const normalizedSensorSize = sensorSize?.trim() || '';

  if (!normalizedCameraName && !normalizedSensorSize) {
    return '';
  }

  if (!normalizedCameraName) {
    return normalizedSensorSize;
  }

  if (!normalizedSensorSize) {
    return normalizedCameraName;
  }

  return `${normalizedCameraName} - ${normalizedSensorSize}`;
}
