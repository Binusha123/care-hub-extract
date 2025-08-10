import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoctorAvailabilityProps {
  doctorId: string;
  isEditable?: boolean;
}

interface Availability {
  id?: string;
  available_from: string;
  available_to: string;
}

const DoctorAvailability = ({ doctorId, isEditable = false }: DoctorAvailabilityProps) => {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [newAvailability, setNewAvailability] = useState({
    available_from: "",
    available_to: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
  }, [doctorId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const addAvailability = async () => {
    if (!newAvailability.available_from || !newAvailability.available_to) {
      toast({
        title: "Missing Information",
        description: "Please fill in both time fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctorId,
          available_from: newAvailability.available_from,
          available_to: newAvailability.available_to
        });

      if (error) throw error;

      toast({
        title: "Availability Added",
        description: "Your availability has been saved successfully",
      });

      setNewAvailability({ available_from: "", available_to: "" });
      fetchAvailability();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Availability Removed",
        description: "Availability slot has been removed",
      });

      fetchAvailability();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Available Timings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availability.length > 0 ? (
            <div className="space-y-2">
              {availability.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{slot.available_from} - {slot.available_to}</span>
                  </div>
                  {isEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAvailability(slot.id!)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No availability set</p>
            </div>
          )}

          {isEditable && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Add New Availability</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-time">From</Label>
                  <Input
                    id="from-time"
                    type="time"
                    value={newAvailability.available_from}
                    onChange={(e) => setNewAvailability(prev => ({
                      ...prev,
                      available_from: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="to-time">To</Label>
                  <Input
                    id="to-time"
                    type="time"
                    value={newAvailability.available_to}
                    onChange={(e) => setNewAvailability(prev => ({
                      ...prev,
                      available_to: e.target.value
                    }))}
                  />
                </div>
              </div>
              <Button 
                onClick={addAvailability} 
                disabled={loading}
                className="w-full mt-3"
              >
                Add Availability
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorAvailability;