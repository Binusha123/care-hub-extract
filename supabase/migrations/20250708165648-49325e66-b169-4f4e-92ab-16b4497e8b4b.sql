-- Create treatment_queue table for patient-doctor coordination
CREATE TABLE public.treatment_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  doctor_id UUID NOT NULL,
  department TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  room_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'en-route', 'with-patient', 'completed')),
  estimated_arrival_minutes INTEGER,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  treatment_started_at TIMESTAMP WITH TIME ZONE,
  treatment_completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.treatment_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for treatment_queue
CREATE POLICY "Patients can view their own treatment queue" 
ON public.treatment_queue 
FOR SELECT 
USING (patient_id = auth.uid()::text OR doctor_id = auth.uid());

CREATE POLICY "Doctors can manage their assigned treatments" 
ON public.treatment_queue 
FOR ALL 
USING (doctor_id = auth.uid());

CREATE POLICY "Staff can manage all treatments" 
ON public.treatment_queue 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role = 'staff'
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_treatment_queue_updated_at
BEFORE UPDATE ON public.treatment_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.treatment_queue REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_queue;