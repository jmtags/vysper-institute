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
  speakers: Speaker[];
}

export interface TrainingAddOn {
  id: string;
  key: string;
  name: string;
  description: string | null;
  pricing_type: 'included' | 'fixed' | 'per_participant';
  unit_price: number;
}

export interface Speaker {
  id: string;
  full_name: string;
  title: string | null;
  specialty: string | null;
  bio_notes: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  sort_order: number;
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

export async function fetchTrainingBySlug(slug: string) {
  const { data, error } = await supabase
    .from('trainings')
    .select('*, category:training_categories(id, name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return mapTraining(data);
}

export async function fetchTrainingDetails(trainingId: string) {
  const { data, error } = await supabase
    .from('trainings')
    .select(`
      *,
      category:training_categories(id, name, slug),
      objectives:training_objectives(objective, sort_order),
      outline:training_outline_items(title, sort_order),
      testimonials:training_testimonials(client_name, client_role, content, rating, sort_order, is_active),
      speaker_links:training_speakers(sort_order, speaker:speakers(id, full_name, title, specialty, bio_notes, profile_image_url, is_active, sort_order))
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
      .sort((a, b) => a.sort_order - b.sort_order),
    speakers: [...(data.speaker_links ?? [])]
      .filter((item) => item.speaker?.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.speaker)
  } satisfies TrainingDetails;
}

export async function fetchSpeakers(includeInactive = false) {
  let query = supabase
    .from('speakers')
    .select('id, full_name, title, specialty, bio_notes, profile_image_url, is_active, sort_order')
    .order('sort_order')
    .order('full_name');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Speaker[];
}

export async function upsertSpeaker(input: {
  id?: string;
  fullName: string;
  title?: string;
  specialty?: string;
  bioNotes?: string;
  profileImageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}) {
  const payload = {
    full_name: input.fullName,
    title: input.title || null,
    specialty: input.specialty || null,
    bio_notes: input.bioNotes || null,
    profile_image_url: input.profileImageUrl || null,
    is_active: input.isActive,
    sort_order: input.sortOrder
  };

  const query = input.id
    ? supabase.from('speakers').update(payload).eq('id', input.id)
    : supabase.from('speakers').insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function setSpeakerActive(speakerId: string, isActive: boolean) {
  const { error } = await supabase
    .from('speakers')
    .update({ is_active: isActive })
    .eq('id', speakerId);

  if (error) throw error;
}

export async function uploadSpeakerProfileImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Speaker photo must be 5MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'speaker';
  const filePath = `${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabase.storage
    .from('speaker-profiles')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('speaker-profiles')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function fetchTrainingSpeakerIds(trainingId: string) {
  const { data, error } = await supabase
    .from('training_speakers')
    .select('speaker_id')
    .eq('training_id', trainingId);

  if (error) throw error;
  return (data ?? []).map((item) => item.speaker_id as string);
}

export async function updateTrainingSpeakers(trainingId: string, speakerIds: string[]) {
  const { error: deleteError } = await supabase
    .from('training_speakers')
    .delete()
    .eq('training_id', trainingId);

  if (deleteError) throw deleteError;

  if (speakerIds.length === 0) return;

  const { error } = await supabase
    .from('training_speakers')
    .insert(speakerIds.map((speakerId, index) => ({
      training_id: trainingId,
      speaker_id: speakerId,
      sort_order: index + 1
    })));

  if (error) throw error;
}

export async function updateTrainingContent(trainingId: string, input: {
  objectives: string[];
  outline: string[];
}) {
  const [objectivesDelete, outlineDelete] = await Promise.all([
    supabase.from('training_objectives').delete().eq('training_id', trainingId),
    supabase.from('training_outline_items').delete().eq('training_id', trainingId)
  ]);

  if (objectivesDelete.error) throw objectivesDelete.error;
  if (outlineDelete.error) throw outlineDelete.error;

  const objectives = input.objectives.map((objective) => objective.trim()).filter(Boolean);
  const outline = input.outline.map((item) => item.trim()).filter(Boolean);

  const inserts = [];
  if (objectives.length > 0) {
    inserts.push(
      supabase.from('training_objectives').insert(objectives.map((objective, index) => ({
        training_id: trainingId,
        objective,
        sort_order: index + 1
      })))
    );
  }

  if (outline.length > 0) {
    inserts.push(
      supabase.from('training_outline_items').insert(outline.map((title, index) => ({
        training_id: trainingId,
        title,
        sort_order: index + 1
      })))
    );
  }

  const results = await Promise.all(inserts);
  const insertError = results.find((result) => result.error)?.error;
  if (insertError) throw insertError;
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
    .select('id, proposal_number, status, total_price, created_at, organization_name, contact_person, contact_email, user_id, admin_notes, decline_reason, training:trainings(title)')
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

export async function updateTrainingProposalReview(input: {
  proposalId: string;
  status: 'draft' | 'submitted' | 'accepted' | 'declined' | 'archived';
  adminNotes?: string;
  declineReason?: string;
}) {
  const { error } = await supabase
    .from('training_proposals')
    .update({
      status: input.status,
      admin_notes: input.adminNotes || null,
      decline_reason: input.status === 'declined' ? input.declineReason || null : null
    })
    .eq('id', input.proposalId);

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
    ? supabase.from('trainings').update(payload).eq('id', input.id).select('id').single()
    : supabase.from('trainings').insert(payload).select('id').single();

  const { data, error } = await query;
  if (error) throw error;
  return data.id as string;
}

export async function setTrainingActive(trainingId: string, isActive: boolean) {
  const { error } = await supabase
    .from('trainings')
    .update({ is_active: isActive })
    .eq('id', trainingId);

  if (error) throw error;
}
