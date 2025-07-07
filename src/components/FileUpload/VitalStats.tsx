import { AlertTriangle } from "lucide-react";

interface VitalStatsProps {
  bloodPressure: string;
  bloodSugar: string;
  cholesterol: string;
}

export const VitalStats = ({ bloodPressure, bloodSugar, cholesterol }: VitalStatsProps) => {
  const getVitalStatus = (vital: string, type: 'bp' | 'sugar' | 'cholesterol') => {
    if (type === 'bp') {
      const [systolic] = vital.split('/').map(Number);
      return systolic > 140 ? 'high' : systolic < 120 ? 'normal' : 'elevated';
    }
    if (type === 'sugar') {
      const value = parseInt(vital);
      return value > 200 ? 'high' : value < 100 ? 'normal' : 'elevated';
    }
    if (type === 'cholesterol') {
      const value = parseInt(vital);
      return value > 240 ? 'high' : value < 200 ? 'normal' : 'elevated';
    }
    return 'normal';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-3 border rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium">Blood Pressure</h5>
          {getVitalStatus(bloodPressure, 'bp') === 'high' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
        <p className="text-lg font-semibold">{bloodPressure}</p>
        <p className="text-xs text-muted-foreground">
          {getVitalStatus(bloodPressure, 'bp')}
        </p>
      </div>

      <div className="p-3 border rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium">Blood Sugar</h5>
          {getVitalStatus(bloodSugar, 'sugar') === 'high' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
        <p className="text-lg font-semibold">{bloodSugar}</p>
        <p className="text-xs text-muted-foreground">
          {getVitalStatus(bloodSugar, 'sugar')}
        </p>
      </div>

      <div className="p-3 border rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium">Cholesterol</h5>
          {getVitalStatus(cholesterol, 'cholesterol') === 'high' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
        <p className="text-lg font-semibold">{cholesterol}</p>
        <p className="text-xs text-muted-foreground">
          {getVitalStatus(cholesterol, 'cholesterol')}
        </p>
      </div>
    </div>
  );
};