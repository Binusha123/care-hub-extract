import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppointmentSchedulerProps {
  riskLevel: string;
}

export const AppointmentScheduler = ({ riskLevel }: AppointmentSchedulerProps) => {
  const { toast } = useToast();

  const scheduleAppointment = () => {
    toast({
      title: "Appointment Requested",
      description: "Your appointment request has been sent to available doctors. You will be contacted soon.",
    });
  };

  if (riskLevel.toLowerCase() === 'low') return null;

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-primary mb-1">Consultation Recommended</h4>
          <p className="text-sm text-muted-foreground">
            Based on your risk level, we recommend scheduling an appointment with a doctor.
          </p>
        </div>
        <Button onClick={scheduleAppointment} className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>
    </div>
  );
};