import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Users, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HelpRequest {
  id: string;
  emergency_id?: string;
  treatment_queue_id?: string;
  requested_by: string;
  requester_role: 'doctor' | 'staff';
  request_type: 'medical_team' | 'specialist' | 'additional_staff';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'pending' | 'assigned' | 'resolved' | 'cancelled';
  assigned_to?: string;
  response_notes?: string;
  created_at: string;
  resolved_at?: string;
  requester_name?: string;
  assigned_name?: string;
}

interface HelpRequestsProps {
  userId: string;
  userRole: 'doctor' | 'staff';
  emergencyId?: string;
  treatmentId?: string;
}

const HelpRequests = ({ userId, userRole, emergencyId, treatmentId }: HelpRequestsProps) => {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [myRequests, setMyRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'medical_team' as const,
    urgency: 'medium' as const,
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchHelpRequests();
    fetchMyRequests();

    // Real-time subscription
    const channel = supabase
      .channel('help_requests_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        fetchHelpRequests();
        fetchMyRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchHelpRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('help_requests')
        .select('*')
        .in('status', ['pending', 'assigned'])
        .order('urgency', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user names
      if (requests && requests.length > 0) {
        const userIds = [
          ...requests.map(r => r.requested_by),
          ...requests.map(r => r.assigned_to).filter(Boolean)
        ];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', userIds);

        const requestsWithNames = requests.map(r => ({
          ...r,
          requester_role: r.requester_role as 'doctor' | 'staff',
          request_type: r.request_type as 'medical_team' | 'specialist' | 'additional_staff',
          urgency: r.urgency as 'low' | 'medium' | 'high' | 'critical',
          status: r.status as 'pending' | 'assigned' | 'resolved' | 'cancelled',
          requester_name: profiles?.find(p => p.user_id === r.requested_by)?.name || 'Unknown',
          assigned_name: r.assigned_to ? profiles?.find(p => p.user_id === r.assigned_to)?.name || 'Unknown' : undefined
        }));

        setHelpRequests(requestsWithNames);
      } else {
        setHelpRequests([]);
      }
    } catch (error) {
      console.error('Error fetching help requests:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('help_requests')
        .select('*')
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get assigned user names
      if (requests && requests.length > 0) {
        const assignedIds = requests.map(r => r.assigned_to).filter(Boolean);
        if (assignedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', assignedIds);

          const requestsWithNames = requests.map(r => ({
            ...r,
            requester_role: r.requester_role as 'doctor' | 'staff',
            request_type: r.request_type as 'medical_team' | 'specialist' | 'additional_staff',
            urgency: r.urgency as 'low' | 'medium' | 'high' | 'critical',
            status: r.status as 'pending' | 'assigned' | 'resolved' | 'cancelled',
            assigned_name: r.assigned_to ? profiles?.find(p => p.user_id === r.assigned_to)?.name || 'Unknown' : undefined
          }));

          setMyRequests(requestsWithNames);
        } else {
          setMyRequests(requests.map(r => ({
            ...r,
            requester_role: r.requester_role as 'doctor' | 'staff',
            request_type: r.request_type as 'medical_team' | 'specialist' | 'additional_staff',
            urgency: r.urgency as 'low' | 'medium' | 'high' | 'critical',
            status: r.status as 'pending' | 'assigned' | 'resolved' | 'cancelled'
          })));
        }
      } else {
        setMyRequests([]);
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
    }
  };

  const handleCreateRequest = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "Description required",
        description: "Please provide a description for the help request",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('help_requests')
        .insert({
          emergency_id: emergencyId || null,
          treatment_queue_id: treatmentId || null,
          requested_by: userId,
          requester_role: userRole,
          request_type: formData.request_type,
          urgency: formData.urgency,
          description: formData.description
        });

      if (error) throw error;

      toast({
        title: "Help request submitted",
        description: "Your help request has been submitted to the medical team",
      });

      setFormData({
        request_type: 'medical_team',
        urgency: 'medium',
        description: ''
      });
      setDialogOpen(false);
      fetchMyRequests();
    } catch (error) {
      console.error('Error creating help request:', error);
      toast({
        title: "Error",
        description: "Failed to submit help request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({
          status: 'assigned',
          assigned_to: userId
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request assigned",
        description: "You have been assigned to this help request",
      });

      fetchHelpRequests();
    } catch (error) {
      console.error('Error assigning request:', error);
      toast({
        title: "Error",
        description: "Failed to assign request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveRequest = async (requestId: string, responseNotes: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({
          status: 'resolved',
          response_notes: responseNotes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request resolved",
        description: "Help request has been marked as resolved",
      });

      fetchHelpRequests();
      fetchMyRequests();
    } catch (error) {
      console.error('Error resolving request:', error);
      toast({
        title: "Error",
        description: "Failed to resolve request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="default">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      case 'assigned': return <Badge variant="default">Assigned</Badge>;
      case 'resolved': return <Badge variant="default" className="bg-green-600">Resolved</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Help Request Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Help Requests</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <HelpCircle className="h-4 w-4 mr-2" />
              Request Help
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Medical Assistance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="request_type">Request Type</Label>
                <Select value={formData.request_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, request_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical_team">Medical Team</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="additional_staff">Additional Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={formData.urgency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the assistance needed..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <Button onClick={handleCreateRequest} disabled={loading} className="w-full">
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Help Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Available Help Requests ({helpRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {helpRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No help requests available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {helpRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.request_type.replace('_', ' ').toUpperCase()}</h4>
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{request.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>👤 Requested by: {request.requester_name} ({request.requester_role})</span>
                        <span>🕒 {format(new Date(request.created_at), 'MMM dd, HH:mm')}</span>
                        {request.assigned_name && <span>👨‍⚕️ Assigned to: {request.assigned_name}</span>}
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && request.requested_by !== userId && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignRequest(request.id)}
                      disabled={loading}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Assign to Me
                    </Button>
                  )}

                  {request.status === 'assigned' && request.assigned_to === userId && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Response notes..."
                        className="min-h-[60px]"
                        id={`response-${request.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const notes = (document.getElementById(`response-${request.id}`) as HTMLTextAreaElement)?.value;
                          handleResolveRequest(request.id, notes || '');
                        }}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            My Help Requests ({myRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You haven't submitted any help requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.request_type.replace('_', ' ').toUpperCase()}</h4>
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{request.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>🕒 Submitted: {format(new Date(request.created_at), 'MMM dd, HH:mm')}</span>
                        {request.assigned_name && <span>👨‍⚕️ Assigned to: {request.assigned_name}</span>}
                        {request.resolved_at && <span>✅ Resolved: {format(new Date(request.resolved_at), 'MMM dd, HH:mm')}</span>}
                      </div>
                    </div>
                  </div>

                  {request.response_notes && (
                    <div className="mt-3 p-3 bg-muted rounded border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Response:</p>
                      <p className="text-sm">{request.response_notes}</p>
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

export default HelpRequests;