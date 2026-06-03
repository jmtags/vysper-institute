import { supabase } from './supabase';

export interface TrainingCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Training {
  id: string;
  category_id: string | null;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  overview: string;
  target_participants: string | null;
  duration: string;
  delivery_mode: string;
  mode: string;
  image_icon: string | null;
  image: string;
  min_participants: number;
  max_participants: number;
  base_price: number;
  is_active: boolean;
  category?: TrainingCategory | null;
}

export interface TrainingDetails extends Training {
  objectives: string[];
  outline: string[];
  testimonials: Array<{
    client_name: string;
    client_role: string | null;
    content: string;
    rating: number;
  }>;
}

export interface TrainingAddOn {
  id: string;
  key: string;
  name: string;
  description: string | null;
  pricing_type: 'included' | 'fixed' | 'per_participant';
  unit_price: number;
}

const iconMap: Record<string, string> = {
  brain: '🧠',
  users: '👥',
  school: '🏫',
  leaf: '🌱',
  message: '💬',
  handshake: '🤝'
};

function mapTraining(row: any): Training {
  return {
    ...row,
    short_description: row.short_description,
    description: row.short_description,
    delivery_mode: row.delivery_mode,
    mode: row.delivery_mode,
    image: iconMap[row.image_icon] ?? '🌿',
    category: row.category ?? null,
    base_price: Number(row.base_price),
    is_active: Boolean(row.is_active)
  };
}

export async function fetchTrainingCategories() {
  const { data, error } = await supabase
    .from('training_categories')
    .select('id, name, slug')
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrainings(includeInactive = false) {
  let query = supabase
    .from('trainings')
    .select('*, category:training_categories(id, name, slug)')
    .order('sort_order');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(mapTraining);
}

export async function fetchTrainingDetails(trainingId: string) {
  const { data, error } = await supabase
    .from('trainings')
    .select(`
      *,
      category:training_categories(id, name, slug),
      objectives:training_objectives(objective, sort_order),
      outline:training_outline_items(title, sort_order),
      testimonials:training_testimonials(client_name, client_role, content, rating, sort_order, is_active)
    `)
    .eq('id', trainingId)
    .single();

  if (error) throw error;

  const training = mapTraining(data);
  return {
    ...training,
    objectives: [...(data.objectives ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.objective),
    outline: [...(data.outline ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.title),
    testimonials: [...(data.testimonials ?? [])]
      .filter((item) => item.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
  } satisfies TrainingDetails;
}

export async function fetchTrainingAddOns() {
  const { data, error } = await supabase
    .from('training_add_ons')
    .select('id, key, name, description, pricing_type, unit_price')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, unit_price: Number(item.unit_price) })) as TrainingAddOn[];
}

export async function createTrainingProposal(input: {
  userId: string;
  trainingId: string;
  organizationName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  participants: number;
  duration: string;
  deliveryMode: string;
  venue: string;
  preferredDate?: string;
  basePrice: number;
  totalPrice: number;
  addOns: Array<{
    addOnId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) {
  const { data: proposal, error } = await supabase
    .from('training_proposals')
    .insert({
      user_id: input.userId,
      training_id: input.trainingId,
      organization_name: input.organizationName || null,
      contact_person: input.contactPerson || null,
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      participants: input.participants,
      duration: input.duration,
      delivery_mode: input.deliveryMode,
      venue: input.venue,
      preferred_date: input.preferredDate || null,
      base_price: input.basePrice,
      total_price: input.totalPrice,
      status: 'submitted'
    })
    .select('id, proposal_number')
    .single();

  if (error) throw error;

  if (input.addOns.length > 0) {
    const { error: addOnsError } = await supabase
      .from('training_proposal_add_ons')
      .insert(input.addOns.map((addOn) => ({
        proposal_id: proposal.id,
        add_on_id: addOn.addOnId,
        quantity: addOn.quantity,
        unit_price: addOn.unitPrice,
        total_price: addOn.totalPrice
      })));

    if (addOnsError) throw addOnsError;
  }

  return proposal;
}

export async function updateTrainingProposal(input: {
  proposalId: string;
  organizationName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  participants: number;
  duration: string;
  deliveryMode: string;
  venue: string;
  preferredDate?: string;
  basePrice: number;
  totalPrice: number;
  addOns: Array<{
    addOnId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) {
  const { error } = await supabase
    .from('training_proposals')
    .update({
      organization_name: input.organizationName || null,
      contact_person: input.contactPerson || null,
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      participants: input.participants,
      duration: input.duration,
      delivery_mode: input.deliveryMode,
      venue: input.venue,
      preferred_date: input.preferredDate || null,
      base_price: input.basePrice,
      total_price: input.totalPrice
    })
    .eq('id', input.proposalId);

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from('training_proposal_add_ons')
    .delete()
    .eq('proposal_id', input.proposalId);

  if (deleteError) throw deleteError;

  if (input.addOns.length > 0) {
    const { error: addOnsError } = await supabase
      .from('training_proposal_add_ons')
      .insert(input.addOns.map((addOn) => ({
        proposal_id: input.proposalId,
        add_on_id: addOn.addOnId,
        quantity: addOn.quantity,
        unit_price: addOn.unitPrice,
        total_price: addOn.totalPrice
      })));

    if (addOnsError) throw addOnsError;
  }
}

export async function fetchTrainingProposals() {
  const { data, error } = await supabase
    .from('training_proposals')
    .select('id, proposal_number, status, total_price, created_at, organization_name, contact_person, contact_email, user_id, training:trainings(title)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrainingProposalDetails(proposalId: string) {
  const { data, error } = await supabase
    .from('training_proposals')
    .select(`
      *,
      training:trainings(*, category:training_categories(id, name, slug)),
      add_ons:training_proposal_add_ons(
        id,
        quantity,
        unit_price,
        total_price,
        add_on:training_add_ons(id, key, name, description, pricing_type, unit_price)
      )
    `)
    .eq('id', proposalId)
    .single();

  if (error) throw error;

  const training = mapTraining(data.training);
  const addOns = (data.add_ons ?? []).map((item: any) => ({
    ...item.add_on,
    unit_price: Number(item.unit_price),
    quantity: item.quantity,
    totalPrice: Number(item.total_price)
  }));

  return {
    proposal: data,
    training,
    formData: {
      participants: String(data.participants),
      duration: data.duration,
      mode: data.delivery_mode,
      venue: data.venue,
      preferredDate: data.preferred_date ?? '',
      addOns: Object.fromEntries(addOns.map((addOn: any) => [addOn.key, true]))
    },
    selectedAddOns: addOns,
    basePrice: Number(data.base_price),
    totalPrice: Number(data.total_price)
  };
}

export async function updateTrainingProposalStatus(proposalId: string, status: 'draft' | 'submitted' | 'accepted' | 'declined' | 'archived') {
  const { error } = await supabase
    .from('training_proposals')
    .update({ status })
    .eq('id', proposalId);

  if (error) throw error;
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateProfileRole(profileId: string, role: 'admin' | 'user') {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId);

  if (error) throw error;
}

export async function upsertTraining(input: {
  id?: string;
  categoryId: string | null;
  slug: string;
  title: string;
  shortDescription: string;
  overview: string;
  targetParticipants: string;
  duration: string;
  deliveryMode: string;
  imageIcon: string;
  minParticipants: number;
  maxParticipants: number;
  basePrice: number;
  isActive: boolean;
}) {
  const payload = {
    category_id: input.categoryId,
    slug: input.slug,
    title: input.title,
    short_description: input.shortDescription,
    overview: input.overview,
    target_participants: input.targetParticipants,
    duration: input.duration,
    delivery_mode: input.deliveryMode,
    image_icon: input.imageIcon,
    min_participants: input.minParticipants,
    max_participants: input.maxParticipants,
    base_price: input.basePrice,
    is_active: input.isActive
  };

  const query = input.id
    ? supabase.from('trainings').update(payload).eq('id', input.id)
    : supabase.from('trainings').insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function setTrainingActive(trainingId: string, isActive: boolean) {
  const { error } = await supabase
    .from('trainings')
    .update({ is_active: isActive })
    .eq('id', trainingId);

  if (error) throw error;
}
