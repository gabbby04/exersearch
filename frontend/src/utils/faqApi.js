// src/utils/faqApi.js
import { api } from "./apiClient";



function safeStr(v) {
  return v == null ? "" : String(v);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeBool(v) {
  return Boolean(v);
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}


function mapFaq(raw = {}) {
  return {
    id: safeNum(raw.faq_id),
    question: safeStr(raw.question),
    answer: safeStr(raw.answer),
    category: safeStr(raw.category),
    displayOrder: safeNum(raw.display_order),
    isActive: safeBool(raw.is_active),
    createdAt: safeStr(raw.created_at),
    updatedAt: safeStr(raw.updated_at),
  };
}


export async function getFaqs(params = {}) {
  const { data } = await api.get("/faqs", { params });

  const payload = data?.data;

  return {
    items: safeArr(payload?.data).map(mapFaq),
    currentPage: safeNum(payload?.current_page),
    lastPage: safeNum(payload?.last_page),
    total: safeNum(payload?.total),
    perPage: safeNum(payload?.per_page),
  };
}

export async function getActiveFaqs(params = {}) {
  const { data } = await api.get("/faqs/active", { params });

  return safeArr(data?.data).map(mapFaq);
}

/**
 * Get single FAQ
 */
export async function getFaq(id) {
  if (!id) return null;

  const { data } = await api.get(`/faqs/${id}`);
  return mapFaq(data?.data);
}

/**
 * Create FAQ
 */
export async function createFaq(payload) {
  const { data } = await api.post("/faqs", payload);
  return mapFaq(data?.data);
}

/**
 * Update FAQ
 */
export async function updateFaq(id, payload) {
  if (!id) throw new Error("FAQ ID is required");

  const { data } = await api.patch(`/faqs/${id}`, payload);
  return mapFaq(data?.data);
}

/**
 * Delete FAQ
 */
export async function deleteFaq(id) {
  if (!id) throw new Error("FAQ ID is required");

  await api.delete(`/faqs/${id}`);
  return true;
}

/**
 * Toggle active status
 */
export async function toggleFaq(id) {
  if (!id) throw new Error("FAQ ID is required");

  const { data } = await api.patch(`/faqs/${id}/toggle`);
  return mapFaq(data?.data);
}