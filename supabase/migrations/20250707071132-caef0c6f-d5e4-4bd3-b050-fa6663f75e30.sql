-- Create emergencies table for alert system
CREATE TABLE public.emergencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  triggered_by UUID NOT NULL REFERENCES auth.users(id),
  location TEXT NOT NULL,
  condition TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency access
CREATE POLICY "Staff can create emergencies" 
ON public.emergencies 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'staff'
  )
);

CREATE POLICY "Doctors can view all emergencies" 
ON public.emergencies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'doctor'
  )
);

CREATE POLICY "Staff can view emergencies they created" 
ON public.emergencies 
FOR SELECT 
USING (triggered_by = auth.uid());

CREATE POLICY "Doctors can update emergencies" 
ON public.emergencies 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'doctor'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_emergencies_updated_at
BEFORE UPDATE ON public.emergencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for emergencies table
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.emergencies;