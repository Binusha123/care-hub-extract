-- Enable realtime for doctor_availability table
ALTER TABLE public.doctor_availability REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_availability;

-- Add date field for proper expiration tracking
ALTER TABLE public.doctor_availability 
ADD COLUMN availability_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create function to clean expired availability
CREATE OR REPLACE FUNCTION public.clean_expired_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete expired availability slots
  DELETE FROM public.doctor_availability
  WHERE availability_date < CURRENT_DATE 
     OR (availability_date = CURRENT_DATE AND available_to < CURRENT_TIME);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean expired availability on every availability query/change
CREATE OR REPLACE TRIGGER trigger_clean_expired_availability
  AFTER INSERT OR UPDATE OR DELETE ON public.doctor_availability
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.clean_expired_availability();

-- Create function to get only active availability
CREATE OR REPLACE FUNCTION public.get_active_availability(doctor_uuid UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  doctor_id UUID,
  available_from TIME,
  available_to TIME,
  availability_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  years_experience INTEGER,
  slot_duration INTEGER,
  specialization TEXT,
  gender TEXT,
  location TEXT,
  full_name TEXT,
  department TEXT
) AS $$
BEGIN
  -- Clean expired slots first
  DELETE FROM public.doctor_availability
  WHERE availability_date < CURRENT_DATE 
     OR (availability_date = CURRENT_DATE AND available_to < CURRENT_TIME);

  -- Return active availability
  RETURN QUERY
  SELECT da.*
  FROM public.doctor_availability da
  WHERE (doctor_uuid IS NULL OR da.doctor_id = doctor_uuid)
    AND (da.availability_date > CURRENT_DATE 
         OR (da.availability_date = CURRENT_DATE AND da.available_to >= CURRENT_TIME))
  ORDER BY da.availability_date, da.available_from;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;