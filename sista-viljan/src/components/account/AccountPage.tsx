"use client";

import { useState, useEffect } from "react";
import { loadLocalDraft } from "@/lib/supabase";
import type { ContactPerson, WillDraft } from "@/lib/types";
import { SwishPayment } from "@/components/will/SwishPayment";

export function AccountPage() {
  const [draft, setDraft] = useState<WillDraft | null>(null);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [newContact, setNewContact] = useState({ name: "", email: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showStoragePayment, setShowStoragePayment] = useState(false);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [storageActive, setStorageActive] = useState(false);
  const [storageExpiry, setStorageExpiry] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadLocalDraft();
    setDraft(saved);
    // In production these would come from Supabase user profile
    const storedContacts = localStorage.getItem("contact_persons");
    if (storedContacts) setContacts(JSON.parse(storedContacts));
    const storedStorage = localStorage.getItem("storage_active");
    if (storedStorage) {
      setStorageActive(true);
      setStorageExpiry(storedStorage);
    }
  }, []);

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) return;
    const updated = [...contacts, { ...newContact, id: crypto.randomUUID() }];
    setContacts(updated);
    localStorage.setItem("contact_persons", JSON.stringify(updated));
    setNewContact({ name: "", email: "" });
    setShowAddContact(false);
  };

  const handleRemoveContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem("contact_persons", JSON.stringify(updated));
  };

  const handleStoragePaid = () => {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 5);
    const expiryStr = expiry.toISOString();
    setStorageActive(true);
    setStorageExpiry(expiryStr);
    localStorage.setItem("storage_active", expiryStr);
    setShowStoragePayment(false);
  };

  const handleUpdatePaid = () => {
    setShowUpdatePayment(false);
    // Redirect to will flow with prefilled data
    window.location.href = "/app";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const storageExpiresFormatted = storageExpiry ? formatDate(storageExpiry) : null;
  const daysToExpiry = storageExpiry
    ? Math.ceil((new Date(storageExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 90;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="font-heading text-base font-semibold text-ink">
            Sista Viljan
          </a>
          <a href="/" className="text-sm text-[#6b7280] hover:text-ink transition-colors">
            Tillbaka
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="label-overline mb-3">Konto</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">Mitt konto</h1>
        </div>

        <div className="space-y-0 divide-y divide-[#e5e5e5]">

          {/* Will status */}
          <section className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
              <div>
                <p className="text-sm font-medium text-ink">Testamente</p>
              </div>
              <div>
                {draft?.paid ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-[#1a2e4a] rounded-full" />
                      <span className="text-sm text-ink">Aktivt testamente</span>
                    </div>
                    {!showUpdatePayment ? (
                      <div className="flex gap-3 flex-wrap">
                        <a href="/app" className="btn-secondary text-sm py-2.5 px-5">
                          Visa dokument
                        </a>
                        <button
                          onClick={() => setShowUpdatePayment(true)}
                          className="btn-secondary text-sm py-2.5 px-5"
                        >
                          Uppdatera testamente — 299 kr
                        </button>
                      </div>
                    ) : (
                      <div className="border border-[#e5e5e5] p-6 max-w-md">
                        <p className="font-heading text-lg font-semibold mb-2">
                          Uppdatera testamente
                        </p>
                        <p className="text-sm text-[#4a5568] mb-6 leading-relaxed">
                          Betala 299 kr för att gå igenom och uppdatera dina svar. Dina nuvarande uppgifter är förifyllda.
                        </p>
                        <SwishPayment
                          product="update"
                          draftId={draft.id}
                          onPaid={handleUpdatePaid}
                          onCancel={() => setShowUpdatePayment(false)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[#6b7280] mb-3">
                      {draft ? "Påbörjat testamente — inte betalt ännu." : "Inget testamente ännu."}
                    </p>
                    <a href="/app" className="btn-primary text-sm py-2.5 px-5">
                      {draft ? "Fortsätt" : "Skriv testamente"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Storage status */}
          <section className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
              <div>
                <p className="text-sm font-medium text-ink">Förvaring</p>
              </div>
              <div>
                {storageActive && storageExpiresFormatted ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${isExpiringSoon ? "bg-amber-500" : "bg-[#1a2e4a]"}`} />
                      <span className="text-sm text-ink">
                        {isExpiringSoon
                          ? `Förvaring går ut snart — ${storageExpiresFormatted}`
                          : `Aktiv förvaring — giltig till ${storageExpiresFormatted}`}
                      </span>
                    </div>
                    {isExpiringSoon && (
                      <div>
                        {!showStoragePayment ? (
                          <button
                            onClick={() => setShowStoragePayment(true)}
                            className="btn-primary text-sm py-2.5 px-5"
                          >
                            Förnya förvaring — 999 kr
                          </button>
                        ) : (
                          <div className="border border-[#e5e5e5] p-6 max-w-md">
                            <SwishPayment
                              product="storage"
                              draftId={draft?.id}
                              onPaid={handleStoragePaid}
                              onCancel={() => setShowStoragePayment(false)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-[#6b7280] leading-relaxed max-w-sm">
                      Förvara ditt testamente säkert hos oss i 5 år. Dina kontaktpersoner kan alltid hämta det.
                    </p>
                    {!showStoragePayment ? (
                      <button
                        onClick={() => setShowStoragePayment(true)}
                        className="btn-primary text-sm py-2.5 px-5"
                      >
                        Aktivera förvaring — 999 kr
                      </button>
                    ) : (
                      <div className="border border-[#e5e5e5] p-6 max-w-md">
                        <SwishPayment
                          product="storage"
                          draftId={draft?.id}
                          onPaid={handleStoragePaid}
                          onCancel={() => setShowStoragePayment(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Contact persons */}
          <section className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
              <div>
                <p className="text-sm font-medium text-ink">Kontaktpersoner</p>
                <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">
                  Dessa personer kan hämta ditt testamente om du har aktiv förvaring.
                </p>
              </div>
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border border-[#e5e5e5] px-4 py-3"
                    style={{ borderRadius: "3px" }}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-[#6b7280]">{c.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(c.id!)}
                      className="text-xs text-[#6b7280] hover:text-red-600 transition-colors"
                    >
                      Ta bort
                    </button>
                  </div>
                ))}

                {contacts.length < 3 && (
                  <>
                    {showAddContact ? (
                      <div className="border border-[#e5e5e5] p-4 space-y-3" style={{ borderRadius: "3px" }}>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={newContact.name}
                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                            placeholder="Namn"
                            className="border border-[#e5e5e5] px-3 py-2 text-sm focus:outline-none focus:border-[#1a2e4a]"
                            style={{ borderRadius: "3px" }}
                          />
                          <input
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                            placeholder="E-post"
                            className="border border-[#e5e5e5] px-3 py-2 text-sm focus:outline-none focus:border-[#1a2e4a]"
                            style={{ borderRadius: "3px" }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleAddContact} className="btn-primary text-sm py-2 px-4">
                            Lägg till
                          </button>
                          <button onClick={() => setShowAddContact(false)} className="btn-secondary text-sm py-2 px-4">
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddContact(true)}
                        className="text-sm text-[#1a2e4a] hover:underline underline-offset-2 flex items-center gap-1.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Lägg till kontaktperson
                        {contacts.length > 0 && (
                          <span className="text-[#9ca3af]">({3 - contacts.length} kvar)</span>
                        )}
                      </button>
                    )}
                  </>
                )}
                {contacts.length === 0 && !showAddContact && (
                  <p className="text-xs text-[#6b7280]">Inga kontaktpersoner tillagda ännu.</p>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Legal disclaimer */}
        <div className="mt-12 pt-8 border-t border-[#e5e5e5]">
          <p className="text-xs text-[#9ca3af] leading-relaxed max-w-2xl">
            Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning. Vid komplicerade situationer rekommenderar vi kontakt med jurist.
          </p>
        </div>
      </main>
    </div>
  );
}
