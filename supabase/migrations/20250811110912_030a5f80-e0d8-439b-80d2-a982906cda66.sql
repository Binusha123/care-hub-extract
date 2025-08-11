-- Enable real-time for treatment_queue table
ALTER TABLE public.treatment_queue REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.treatment_queue;

-- Enable real-time for emergencies table
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.emergencies;

-- Enable real-time for doctor_availability table
ALTER TABLE public.doctor_availability REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.doctor_availability;