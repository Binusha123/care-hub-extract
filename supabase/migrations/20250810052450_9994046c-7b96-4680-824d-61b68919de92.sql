-- Create doctor_availability table for managing doctor timings
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  available_from TIME NOT NULL,
  available_to TIME NOT NULL,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday), NULL for general availability
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

-- Enable Row Level Security
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor availability
CREATE POLICY "Doctors can manage their own availability" 
ON public.doctor_availability 
FOR ALL 
USING (auth.uid() = doctor_id);

CREATE POLICY "Everyone can view doctor availability" 
ON public.doctor_availability 
FOR SELECT 
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update emergencies table to have status column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergencies' AND column_name = 'status') THEN
        ALTER TABLE public.emergencies ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;