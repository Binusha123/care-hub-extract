-- Create resolved_cases table to track resolved emergencies
CREATE TABLE public.resolved_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_id UUID NOT NULL,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  doctor_id UUID NOT NULL,
  resolved_by UUID NOT NULL,
  condition TEXT NOT NULL,
  location TEXT NOT NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create help_requests table for doctors/staff requesting assistance
CREATE TABLE public.help_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_id UUID,
  treatment_queue_id UUID,
  requested_by UUID NOT NULL,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('doctor', 'staff')),
  request_type TEXT NOT NULL CHECK (request_type IN ('medical_team', 'specialist', 'additional_staff')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved', 'cancelled')),
  assigned_to UUID,
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.resolved_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for resolved_cases
CREATE POLICY "Medical staff can view all resolved cases" 
ON public.resolved_cases 
FOR SELECT 
USING (public.is_medical_staff());

CREATE POLICY "Medical staff can create resolved cases" 
ON public.resolved_cases 
FOR INSERT 
WITH CHECK (public.is_medical_staff());

CREATE POLICY "Medical staff can update resolved cases" 
ON public.resolved_cases 
FOR UPDATE 
USING (public.is_medical_staff());

-- RLS policies for help_requests
CREATE POLICY "Medical staff can view all help requests" 
ON public.help_requests 
FOR SELECT 
USING (public.is_medical_staff());

CREATE POLICY "Medical staff can create help requests" 
ON public.help_requests 
FOR INSERT 
WITH CHECK (public.is_medical_staff());

CREATE POLICY "Medical staff can update help requests" 
ON public.help_requests 
FOR UPDATE 
USING (public.is_medical_staff());

-- Add triggers for updated_at columns
CREATE TRIGGER update_resolved_cases_updated_at
  BEFORE UPDATE ON public.resolved_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the new tables
ALTER TABLE public.resolved_cases REPLICA IDENTITY FULL;
ALTER TABLE public.help_requests REPLICA IDENTITY FULL;