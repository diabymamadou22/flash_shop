import jsPDF from 'jspdf';
import { Sale, SaleItem, ShopSettings } from '../types/index.ts';
import { formatCurrency, formatDate } from './formatters.ts';

export function generateInvoicePDF(
  sale: Sale,
  items: SaleItem[],
  settings?: Partial<ShopSettings>
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = settings?.shop_name || 'FLASH-SHOP';
  const shopTagline = settings?.shop_tagline || 'Vente de Matériels Électroniques & High-Tech';
  const shopPhone = settings?.phone || '+225 07 88 99 00 11';
  const shopEmail = settings?.email || 'contact@flash-shop.ci';
  const shopAddress = settings?.address || "Boulevard Giscard d'Estaing, Zone 4";
  const shopCity = settings?.city || "Abidjan, Côte d'Ivoire";
  const currency = settings?.currency || 'FCFA';
  const footerNote = settings?.receipt_footer || 'Garantie légale 12 mois sur les équipements électroniques.';

  // Palette de couleurs FLASH-SHOP (Bleu pro & Orange)
  const primaryBlue = [15, 43, 89]; // #0F2B59
  const accentOrange = [249, 115, 22]; // #F97316
  const textDark = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const bgLight = [248, 250, 252]; // #F8FAFC

  // 1. En-tête bleu institutionnel
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Accent band orange
  doc.setFillColor(accentOrange[0], accentOrange[1], accentOrange[2]);
  doc.rect(0, 38, 210, 3, 'F');

  // Logo / Titre
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(shopName, 18, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(shopTagline, 18, 25);
  doc.text(`${shopAddress} · ${shopCity}`, 18, 30);

  // Bloc Facture à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FACTURE DE VENTE', 192, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`N° ${sale.sale_number}`, 192, 26, { align: 'right' });
  doc.text(formatDate(sale.created_at), 192, 32, { align: 'right' });

  // 2. Coordonnées & Métadonnées
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  let currentY = 52;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(18, currentY, 85, 26, 2, 2, 'F');
  doc.roundedRect(107, currentY, 85, 26, 2, 2, 'F');

  // Vendeur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('ÉMIS PAR :', 22, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${shopName} - Service Commercial`, 22, currentY + 12);
  doc.text(`Tél : ${shopPhone}`, 22, currentY + 17);
  doc.text(`Email : ${shopEmail}`, 22, currentY + 22);

  // Client / Règlement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('DÉTAILS DU RÈGLEMENT :', 111, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Mode : Espèces (${currency})`, 111, currentY + 12);
  doc.text(`Caissier / Opérateur : ${sale.cashier_name || 'Comptoir'}`, 111, currentY + 17);
  doc.text(`Statut : VALIDÉE & PAYÉE`, 111, currentY + 22);

  // 3. Tableau des articles
  currentY = 88;

  // En-tête du tableau
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(18, currentY, 174, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RÉFÉRENCE', 22, currentY + 6);
  doc.text('DÉSIGNATION DU PRODUIT', 55, currentY + 6);
  doc.text('P.U. (FCFA)', 125, currentY + 6, { align: 'right' });
  doc.text('QTÉ', 148, currentY + 6, { align: 'center' });
  doc.text('TOTAL (FCFA)', 188, currentY + 6, { align: 'right' });

  currentY += 9;

  // Lignes
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  items.forEach((item, index) => {
    // Alternance de fond
    if (index % 2 === 1) {
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(18, currentY, 174, 8, 'F');
    }

    doc.setFontSize(8.5);
    doc.text(item.product_ref, 22, currentY + 5.5);

    // Tronquer si trop long
    const cleanName = item.product_name.length > 42 ? item.product_name.substring(0, 40) + '...' : item.product_name;
    doc.text(cleanName, 55, currentY + 5.5);

    doc.text(formatCurrency(item.unit_price, '').trim(), 125, currentY + 5.5, { align: 'right' });
    doc.text(String(item.quantity), 148, currentY + 5.5, { align: 'center' });
    doc.text(formatCurrency(item.total_price, '').trim(), 188, currentY + 5.5, { align: 'right' });

    currentY += 8;
  });

  // Ligne de séparation
  doc.setDrawColor(226, 232, 240);
  doc.line(18, currentY, 192, currentY);

  currentY += 6;

  // 4. Bloc des Totaux
  const totalBoxX = 115;
  const totalBoxW = 77;

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(totalBoxX, currentY, totalBoxW, 34, 2, 2, 'F');

  doc.setFontSize(9);
  doc.text('Sous-total :', totalBoxX + 4, currentY + 7);
  doc.text(formatCurrency(sale.total_amount, currency), totalBoxX + totalBoxW - 4, currentY + 7, { align: 'right' });

  doc.text('Montant Reçu (Espèces) :', totalBoxX + 4, currentY + 14);
  doc.text(formatCurrency(sale.amount_received, currency), totalBoxX + totalBoxW - 4, currentY + 14, { align: 'right' });

  doc.text('Monnaie Rendue :', totalBoxX + 4, currentY + 21);
  doc.text(formatCurrency(sale.change_returned, currency), totalBoxX + totalBoxW - 4, currentY + 21, { align: 'right' });

  // Ligne mise en avant Total Payé
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.roundedRect(totalBoxX, currentY + 25, totalBoxW, 9, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL NET PAYÉ :', totalBoxX + 4, currentY + 31);
  doc.text(formatCurrency(sale.total_amount, currency), totalBoxX + totalBoxW - 4, currentY + 31, { align: 'right' });

  // 5. Notes & Garantie
  currentY += 44;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONDITIONS & GARANTIES :', 18, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('• Les articles électroniques vendus par FLASH-SHOP bénéficient de la garantie constructeur de 12 mois.', 18, currentY + 5);
  doc.text('• La facture originale est indispensable pour faire valoir la garantie auprès de notre service après-vente.', 18, currentY + 10);
  doc.text('• Aucun échange ni remboursement sans présentation du présent justificatif.', 18, currentY + 15);

  // 6. Pied de page
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 275, 192, 275);
  doc.setFontSize(8);
  doc.text(`${shopName} · ${shopTagline} · Tél: ${shopPhone} · ${shopEmail}`, 105, 281, { align: 'center' });
  doc.text(footerNote, 105, 286, { align: 'center' });

  // Télécharger le fichier PDF
  doc.save(`Facture_${sale.sale_number}.pdf`);
}
