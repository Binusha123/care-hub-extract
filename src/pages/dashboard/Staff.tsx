import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  AlertTriangle,
  User,
  LogOut,
  MapPin,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    location: "",
    condition: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUser({
        ...user,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'staff'
      });
    };

    getUser();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTriggerEmergency = async () => {
    if (!formData.patient_id || !formData.location || !formData.condition) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('emergencies')
        .insert({
          patient_id: formData.patient_id,
          patient_name: formData.patient_name || null,
          location: formData.location,
          condition: formData.condition,
          triggered_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Emergency Alert Sent",
        description: "All doctors have been notified immediately",
      });

      // Reset form
      setFormData({
        patient_id: "",
        patient_name: "",
        location: "",
        condition: ""
      });
    } catch (error) {
      console.error('Error creating emergency:', error);
      toast({
        title: "Error",
        description: "Failed to send emergency alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    navigate('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">MediAid</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="font-medium">{user.name}</span>
              <Badge variant="secondary">Staff</Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Staff Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor patient care and trigger emergency alerts when needed.
          </p>
        </div>

        {/* Emergency Trigger Panel */}
        <Card className="mb-8 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
              Trigger Emergency Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID *</Label>
                <Input
                  id="patient_id"
                  placeholder="Enter patient ID"
                  value={formData.patient_id}
                  onChange={(e) => handleInputChange('patient_id', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name (optional)</Label>
                <Input
                  id="patient_name"
                  placeholder="Enter patient name"
                  value={formData.patient_name}
                  onChange={(e) => handleInputChange('patient_name', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location / Room No *</Label>
              <Input
                id="location"
                placeholder="e.g., Ward 2, Room 5"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition / Emergency Details *</Label>
              <Textarea
                id="condition"
                placeholder="Brief summary of symptoms or emergency situation"
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleTriggerEmergency}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Sending Alert..." : "🚨 Trigger Emergency"}
            </Button>
          </CardContent>
        </Card>

        {/* Staff Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Ward</p>
                  <p className="text-2xl font-bold">Ward 3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift Status</p>
                  <p className="text-lg font-semibold">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Heart className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Priority Patients</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;