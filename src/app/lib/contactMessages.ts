import { supabase } from './supabase';

export type ContactMessageStatus = 'new' | 'read' | 'archived';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
  updated_at: string;
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  message: string;
}) {
  const { error } = await supabase
    .from('contact_messages')
    .insert({
      name: input.name.trim(),
      email: input.email.trim(),
      message: input.message.trim()
    });

  if (error) throw error;
}

export async function fetchContactMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id, name, email, message, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContactMessage[];
}

export async function updateContactMessageStatus(id: string, status: ContactMessageStatus) {
  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}
