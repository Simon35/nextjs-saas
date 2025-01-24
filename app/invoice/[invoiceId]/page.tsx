/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { deleteInvoice, getInvoiceById, updateInvoice } from "@/app/action";
import InvoiceInfo from "@/app/components/InvoiceInfo";
import InvoiceLines from "@/app/components/InvoiceLines";
import VATControl from "@/app/components/VATControl";
import Wrapper from "@/app/components/Wrapper";
import { Invoice, Totals } from "@/type";
import { Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

// on va récupérer l'id
const page = ({ params }: { params: Promise<{ invoiceId: string }> }) => {
  // Invoice est null par défaut
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [initialInvoice, setInitialInvoice] = useState<Invoice | null>(null);

  // les totaux
  const [totals, setTotals] = useState<Totals | null>(null);

  // btn sauvegarder, par défaut désactivé
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // redirection après suppression
  const router = useRouter();

  const fetchInvoice = async () => {
    try {
      const { invoiceId } = await params;
      const fetchedInvoice = await getInvoiceById(invoiceId);
      if (fetchedInvoice) {
        setInvoice(fetchedInvoice);
        setInitialInvoice(fetchedInvoice);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, []);

  useEffect(() => {
    if (!invoice) return;
    const ht = invoice.lines.reduce(
      (acc, { quantity, unitPrice }) => acc + quantity * unitPrice,
      0
    );
    const vat = invoice.vatActive ? ht * (invoice.vatRate / 100) : 0;
    // totalHT est un type json donc {} de Invoice dans type.ts
    setTotals({ totalHT: ht, totalVAT: vat, totalTTC: ht + vat });
  }, [invoice]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = parseInt(e.target.value);
    if (invoice) {
      // si on a un objet invoice, on prend toutes les infos de invoice et on change le statut, égal à newStatus
      // setInvoice, on met à jour invoice
      const updatedInvoice = { ...invoice, status: newStatus };
      setInvoice(updatedInvoice);
    }
  };

  useEffect(() => {
    setIsSaveDisabled(
      JSON.stringify(invoice) === JSON.stringify(initialInvoice)
    );
  }, [invoice, initialInvoice]);

  const handleSave = async () => {
    if (!invoice) return;
    setIsLoading(true);
    try {
      // on appelle la fonction créée qui met à jour les lignes de la facture
      await updateInvoice(invoice);
      const updatedInvoice = await getInvoiceById(invoice.id);
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        setInitialInvoice(updatedInvoice);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la facture :", error);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")

    if (confirmed) {
      try {
        await deleteInvoice(invoice?.id as string)
        router.push("/")
      } catch (error) {
        console.error("Erreur lors de la suppression de la facture.", error);
      }
    }
  }


  // si pas de facture ou pas de totaux
  if (!invoice || !totals)
    return (
      <div className="flex justify-center items-center h-screen w-full ">
        <span className="font-bold">Facture Non Trouvée</span>
      </div>
    );

  return (
    <Wrapper>
      <div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <p className="badge  badge-ghost badge-lg uppercase">
            <span>Facture-</span>
            {invoice?.id}
          </p>
          <div className="flex md:mt-0 mt-4">
            <select
              className="select select-sm select-bordered w-full"
              value={invoice?.status}
              onChange={handleStatusChange}
            >
              <option value={1}>Brouillon</option>
              <option value={2}>En attente</option>
              <option value={3}>Payée</option>
              <option value={4}>Annulée</option>
              <option value={5}>Impayée</option>
            </select>

            <button
              className="btn btn-sm btn-accent ml-4"
              disabled={isSaveDisabled || isLoading}
              onClick={handleSave}
            >
            {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <Save className="w-4 ml-2" />
                </>
              )}
              Sauvegarder
            </button>
            <button
              onClick={handleDelete}
              className='btn btn-sm btn-accent ml-4'>
              <Trash className='w-4' />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row w-full">
          <div className="flex  w-full md:w-1/3 flex-col">
            <div className="mb-4 bg-base-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4 ">
                <div className="badge badge-accent">Résumé des Totaux</div>
                <VATControl invoice={invoice} setInvoice={setInvoice} />
              </div>

              <div className="flex justify-between">
                <span>Total Hors Taxes</span>
                <span> {totals.totalHT.toFixed(2)} €</span>
              </div>

              <div className="flex justify-between">
                <span>
                  TVA ({invoice?.vatActive ? `${invoice?.vatRate}` : "0"} %)
                </span>
                <span> {totals.totalVAT.toFixed(2)} €</span>
              </div>

              <div className="flex justify-between font-bold">
                <span>Total TTC</span>
                <span> {totals.totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            <InvoiceInfo invoice={invoice} setInvoice={setInvoice} />
          </div>

          <div className="flex w-full md:w-2/3 flex-col md:ml-4">
            <InvoiceLines invoice={invoice} setInvoice={setInvoice} />
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default page;
