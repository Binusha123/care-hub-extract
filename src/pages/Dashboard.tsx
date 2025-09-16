import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Import role-specific dashboards
import PatientDashboard from "./dashboard/Patient";
import StaffDashboard from "./dashboard/Staff";
import DoctorDashboard from "./dashboard/Doctor";

interface Profile {
  role: string;
  name?: string;
  department?: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/login", { replace: true });
          return;
        }

        setUser(session.user);

        // Get user profile to determine role
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('role, name, department')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load user profile. Please try logging in again.",
          });
          navigate("/login", { replace: true });
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Auth check error:', error);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/login", { replace: true });
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        // Refresh profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, name, department')
          .eq('user_id', session.user.id)
          .single();
        setProfile(profileData);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Render the appropriate dashboard based on user role
  switch (profile.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Role</h1>
            <p className="text-muted-foreground mb-6">
              Your account role "{profile.role}" is not recognized. Please contact support.
            </p>
            <button
              onClick={() => {
                supabase.auth.signOut();
                navigate("/login");
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
  }
};

export default Dashboard;