import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Emergency {
  id: string;
  patient_id: string;
  patient_name: string;
  location: string;
  condition: string;
  status: string;
  resolved: boolean;
  created_at: string;
}

interface ResolvedCase {
  id: string;
  emergency_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  resolved_by: string;
  condition: string;
  location: string;
  resolution_notes?: string;
  resolved_at: string;
  resolver_name?: string;
}

interface ResolvedCasesProps {
  doctorId: string;
}

const ResolvedCases = ({ doctorId }: ResolvedCasesProps) => {
  const [activeEmergencies, setActiveEmergencies] = useState<Emergency[]>([]);
  const [resolvedCases, setResolvedCases] = useState<ResolvedCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveEmergencies();
    fetchResolvedCases();

    // Real-time subscriptions
    const emergencyChannel = supabase
      .channel('resolved_cases_emergencies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, () => {
        fetchActiveEmergencies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resolved_cases' }, () => {
        fetchResolvedCases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(emergencyChannel);
    };
  }, []);

  const fetchActiveEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveEmergencies(data || []);
    } catch (error) {
      console.error('Error fetching active emergencies:', error);
    }
  };

  const fetchResolvedCases = async () => {
    try {
      const { data: cases, error } = await supabase
        .from('resolved_cases')
        .select('*')
        .order('resolved_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get resolver names
      if (cases && cases.length > 0) {
        const resolverIds = cases.map(c => c.resolved_by);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', resolverIds);

        const casesWithNames = cases.map(c => ({
          ...c,
          resolver_name: profiles?.find(p => p.user_id === c.resolved_by)?.name || 'Unknown'
        }));

        setResolvedCases(casesWithNames);
      } else {
        setResolvedCases([]);
      }
    } catch (error) {
      console.error('Error fetching resolved cases:', error);
    }
  };

  const handleResolveEmergency = async (emergency: Emergency) => {
    if (!resolutionNotes[emergency.id]?.trim()) {
      toast({
        title: "Resolution notes required",
        description: "Please provide resolution notes before marking as resolved",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update emergency as resolved
      const { error: emergencyError } = await supabase
        .from('emergencies')
        .update({ resolved: true, status: 'resolved' })
        .eq('id', emergency.id);

      if (emergencyError) throw emergencyError;

      // Create resolved case record
      const { error: resolvedError } = await supabase
        .from('resolved_cases')
        .insert({
          emergency_id: emergency.id,
          patient_id: emergency.patient_id,
          patient_name: emergency.patient_name,
          doctor_id: doctorId,
          resolved_by: doctorId,
          condition: emergency.condition,
          location: emergency.location,
          resolution_notes: resolutionNotes[emergency.id]
        });

      if (resolvedError) throw resolvedError;

      // Clear resolution notes
      setResolutionNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[emergency.id];
        return newNotes;
      });

      toast({
        title: "Emergency resolved",
        description: `Emergency for ${emergency.patient_name} has been successfully resolved`,
      });

      fetchActiveEmergencies();
      fetchResolvedCases();
    } catch (error) {
      console.error('Error resolving emergency:', error);
      toast({
        title: "Error",
        description: "Failed to resolve emergency. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Emergencies to Resolve */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Active Emergencies ({activeEmergencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEmergencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active emergencies to resolve</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeEmergencies.map((emergency) => (
                <div key={emergency.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{emergency.patient_name}</h4>
                      <p className="text-muted-foreground">{emergency.condition}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span>📍 {emergency.location}</span>
                        <span>🕒 {format(new Date(emergency.created_at), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      Active Emergency
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`notes-${emergency.id}`}>Resolution Notes *</Label>
                      <Textarea
                        id={`notes-${emergency.id}`}
                        placeholder="Describe the resolution, treatment provided, or outcome..."
                        value={resolutionNotes[emergency.id] || ''}
                        onChange={(e) => setResolutionNotes(prev => ({
                          ...prev,
                          [emergency.id]: e.target.value
                        }))}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => handleResolveEmergency(emergency)}
                      disabled={loading || !resolutionNotes[emergency.id]?.trim()}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Resolved Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Recently Resolved Cases ({resolvedCases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No resolved cases yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resolvedCases.map((resolvedCase) => (
                <div key={resolvedCase.id} className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{resolvedCase.patient_name}</h4>
                      <p className="text-muted-foreground text-sm">{resolvedCase.condition}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>📍 {resolvedCase.location}</span>
                        <span>👨‍⚕️ Resolved by: {resolvedCase.resolver_name}</span>
                        <span>🕒 {format(new Date(resolvedCase.resolved_at), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      Resolved
                    </Badge>
                  </div>

                  {resolvedCase.resolution_notes && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Resolution Notes:</p>
                      <p className="text-sm">{resolvedCase.resolution_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResolvedCases;