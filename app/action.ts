"use server"

import prisma from "@/lib/prisma";
import { Invoice } from "@/type";
import { randomBytes } from "crypto";

export async function checkAndAddUser(email: string, name: string) {
    if (!email) return; // on sort de la fonction
    //findUnique permet recherche l'utilisateur qui se connecte
    try {
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        // si user n'existe pas, on va le créer
        if (!existingUser && name) {
            await prisma.user.create({
                data: {
                    email,
                    name
                }
            })
        }
    } catch (error) {
        console.log(error)
    }
}

const generateUniqueId = async () => {
    let uniqueId;
    let isUnique = false;

    while (!isUnique) {
        // on créé un id unique et on vérifie s'il est présent en bdd
        uniqueId = randomBytes(3).toString('hex')
        const existingInvoice = await prisma.invoice.findUnique({
            where: {
                id: uniqueId
            }
        })
        if (!existingInvoice) {
            isUnique = true;
        }
    }
    return uniqueId
}

export async function createEmptyInvoice(email: string, name: string) {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        const invoiceId = await generateUniqueId() as string

        if (user) {
            await prisma.invoice.create({
                data: {
                    id: invoiceId,
                    name: name,
                    userId: user?.id,
                    issuerName: "",
                    issuerAddress: "",
                    clientName: "",
                    clientAddress: "",
                    invoiceDate: "",
                    dueDate: "",
                    vatActive: false,
                    vatRate: 20,
                }
            })
        }
    } catch (error) {
        console.error(error)
    }
}

// affichage des factures de la personne, on inclut les lignes

export async function getInvoicesByEmail(email: string) {
    if (!email) return;
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            },
            include: {
                invoices: {
                    include: {
                        lines: true,
                    }
                }
            }
        })
        // Statuts possibles :
        // 1: Brouillon
        // 2: En attente
        // 3: Payée
        // 4: Annulée
        // 5: Impayé
        if (user) {
            // date du jour
            // si on a des factures avec une date dépassée, on va changer le statut
            // chaque facture a un statut
            // la date d'échéance : dueDate
            // on mmap chaue facture : invoice, on récupère la dueDate (echeance), 
            // pour comparer avec date du jour, on veut que le format de type date (new Date)

            // mise a jour des fatures : prisma.invoice.update, qui ont une date dépassé
            const today = new Date()

            //on met à jour les factures
            const updatedInvoices = await Promise.all(
                user.invoices.map(async (invoice) => {
                    const dueDate = new Date(invoice.dueDate)
                    // si 08/01 < 10/01
                    if (
                        dueDate < today &&
                        invoice.status == 2
                    ) 
                    // alors
                    {
                        const updatedInvoice = await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { status: 5 },
                            include: { lines: true }
                        })
                        return updatedInvoice
                    }
                    return invoice
                })
            )
            return updatedInvoices

        }
    } catch (error) {
        console.error(error)
    }
}

export async function getInvoiceById(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                lines: true
            }
        })
        if (!invoice) {
            throw new Error("Facture non trouvée.");
        }
        return invoice
    } catch (error) {
        console.error(error)
    }
}

export async function updateInvoice(invoice:Invoice) {
    try {
        const existingInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id },
            include: {
                lines: true
            }
        })

        if (!existingInvoice) {
            throw new Error(`Facture avec l'ID ${invoice.id} introuvable.`);
        }

        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                issuerName: invoice.issuerName,
                issuerAddress: invoice.issuerAddress,
                clientName: invoice.clientName,
                clientAddress: invoice.clientAddress,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                vatActive: invoice.vatActive,
                vatRate: invoice.vatRate,
                status: invoice.status,
            },
        })

        // on lit les lignes issues de la BDD et on compare lignes existantes et ajoutées
        const existingLines = existingInvoice.lines
        const receivedLines = invoice.lines
        
        const linesToDelete = existingLines.filter(
            (existingLine) => !receivedLines.some((line) => line.id === existingLine.id)
        )

        // suppression des lignes émanant de linesToDelete
        if (linesToDelete.length > 0) {
            await prisma.invoiceLine.deleteMany({
                where: {
                    id: { in: linesToDelete.map((line) => line.id) }
                }
            })
        }

        for (const line of receivedLines) {
            const existingLine = existingLines.find((el) => el.id == line.id)
            if (existingLine) {
                const hasChanged =
                    line.description !== existingLine.description ||
                    line.quantity !== existingLine.quantity ||
                    line.unitPrice !== existingLine.unitPrice;

                if (hasChanged) {
                    await prisma.invoiceLine.update({
                        where: { id: line.id },
                        data: {
                            description: line.description,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,

                        }
                    })
                }
            } else {
                //créer une nouvelle ligne
                await prisma.invoiceLine.create({
                    data: {
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        invoiceId: invoice.id
                    }
                })
            }
        }
    } catch (error) {
        console.error(error)
    }
}

export async function deleteInvoice(invoiceId: string) {
    try {
        const deleteInvoice = await prisma.invoice.delete({
            where: { id: invoiceId }
        })
        if (!deleteInvoice) {
            throw new Error("Erreur lors de la suppression de la facture.");
        }
    } catch (error) {
        console.error(error)
    }
}

