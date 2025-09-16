import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface NotificationEmailData {
  userEmail: string;
  userName: string;
  bookTitle: string;
  bookAuthor: string;
  dueDate: Date;
  overdueDays: number;
  notificationType: 'overdue_reminder' | 'final_notice';
  notificationCount: number;
}

interface VerificationEmailData {
  userEmail: string;
  userName: string;
  verificationToken: string;
  verificationUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter (using environment variables)
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendOverdueNotification(data: NotificationEmailData): Promise<boolean> {
    try {
      const { subject, htmlContent, textContent } = this.generateNotificationContent(data);

      const mailOptions = {
        from: `"BiblioDz Library" <${process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    try {
      const { subject, htmlContent, textContent } = this.generateVerificationContent(data);

      const mailOptions = {
        from: `"BiblioDz Library" <${process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject,
        text: textContent,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${data.userEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  private generateNotificationContent(data: NotificationEmailData) {
    const { userName, bookTitle, bookAuthor, dueDate, overdueDays, notificationType, notificationCount } = data;
    
    const isArabic = /[\u0600-\u06FF]/.test(userName);
    const direction = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'fr';

    if (notificationType === 'final_notice') {
      return {
        subject: isArabic 
          ? `إشعار نهائي - إرجاع الكتاب المتأخر: ${bookTitle}`
          : `Avis Final - Retour de livre en retard: ${bookTitle}`,
        textContent: this.generateFinalNoticeText(data, isArabic),
        htmlContent: this.generateFinalNoticeHtml(data, direction, lang)
      };
    } else {
      return {
        subject: isArabic 
          ? `تذكير ${notificationCount} - إرجاع الكتاب: ${bookTitle}`
          : `Rappel ${notificationCount} - Retour de livre: ${bookTitle}`,
        textContent: this.generateReminderText(data, isArabic),
        htmlContent: this.generateReminderHtml(data, direction, lang)
      };
    }
  }

  private generateVerificationContent(data: VerificationEmailData) {
    const { userName, userEmail, verificationToken, verificationUrl } = data;
    
    const isArabic = /[\u0600-\u06FF]/.test(userName);
    const direction = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'fr';

    return {
      subject: isArabic 
        ? `تأكيد البريد الإلكتروني`
        : `Confirmation de l'email`,
      textContent: this.generateVerificationText(data, isArabic),
      htmlContent: this.generateVerificationHtml(data, direction, lang)
    };
  }

  private generateReminderText(data: NotificationEmailData, isArabic: boolean): string {
    const { userName, bookTitle, bookAuthor, dueDate, overdueDays } = data;
    
    if (isArabic) {
      return `
مرحباً ${userName},

هذا تذكير بأن الكتاب التالي متأخر عن موعد الإرجاع:

📚 عنوان الكتاب: ${bookTitle}
✍️ المؤلف: ${bookAuthor}
📅 تاريخ الاستحقاق: ${dueDate.toLocaleDateString('ar-DZ')}
⏰ عدد الأيام المتأخرة: ${overdueDays} يوم

يرجى إرجاع الكتاب في أقرب وقت ممكن لتجنب الغرامات الإضافية.

شكراً لك،
مكتبة BiblioDz
      `;
    } else {
      return `
Bonjour ${userName},

Ceci est un rappel que le livre suivant est en retard:

📚 Titre: ${bookTitle}
✍️ Auteur: ${bookAuthor}
📅 Date d'échéance: ${dueDate.toLocaleDateString('fr-DZ')}
⏰ Jours de retard: ${overdueDays} jour(s)

Veuillez retourner le livre dès que possible pour éviter des amendes supplémentaires.

Merci,
Bibliothèque BiblioDz
      `;
    }
  }

  private generateFinalNoticeText(data: NotificationEmailData, isArabic: boolean): string {
    const { userName, bookTitle, bookAuthor, dueDate, overdueDays } = data;
    
    if (isArabic) {
      return `
${userName} العزيز/العزيزة،

هذا إشعار نهائي بخصوص الكتاب المتأخر:

📚 عنوان الكتاب: ${bookTitle}
✍️ المؤلف: ${bookAuthor}
📅 تاريخ الاستحقاق: ${dueDate.toLocaleDateString('ar-DZ')}
⏰ عدد الأيام المتأخرة: ${overdueDays} يوم

⚠️ تحذير: إذا لم يتم إرجاع الكتاب خلال 7 أيام، قد يتم تعليق حسابك في المكتبة وفرض غرامات إضافية.

يرجى الاتصال بالمكتبة فوراً لحل هذه المسألة.

مكتبة BiblioDz
      `;
    } else {
      return `
Cher/Chère ${userName},

Ceci est un avis final concernant votre livre en retard:

📚 Titre: ${bookTitle}
✍️ Auteur: ${bookAuthor}
📅 Date d'échéance: ${dueDate.toLocaleDateString('fr-DZ')}
⏰ Jours de retard: ${overdueDays} jour(s)

⚠️ Attention: Si le livre n'est pas retourné dans les 7 jours, votre compte pourrait être suspendu et des amendes supplémentaires appliquées.

Veuillez contacter la bibliothèque immédiatement pour résoudre cette situation.

Bibliothèque BiblioDz
      `;
    }
  }

  private generateVerificationText(data: VerificationEmailData, isArabic: boolean): string {
    const { userName, userEmail, verificationToken, verificationUrl } = data;
    
    if (isArabic) {
      return `
مرحباً ${userName},

يرجى الضغط على الرابط التالي لتأكيد بريدك الإلكتروني:

${verificationUrl}?token=${verificationToken}

شكراً لك،
مكتبة BiblioDz
      `;
    } else {
      return `
Bonjour ${userName},

Veuillez cliquer sur le lien suivant pour confirmer votre adresse email:

${verificationUrl}?token=${verificationToken}

Merci,
Bibliothèque BiblioDz
      `;
    }
  }

  private generateReminderHtml(data: NotificationEmailData, direction: string, lang: string): string {
    const { userName, bookTitle, bookAuthor, dueDate, overdueDays, notificationCount } = data;
    const isArabic = lang === 'ar';
    
    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isArabic ? 'تذكير إرجاع الكتاب' : 'Rappel de retour de livre'}</title>
    <style>
        body { font-family: ${isArabic ? 'Tahoma, Arial' : 'Arial, sans-serif'}; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .book-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 BiblioDz</h1>
            <h2>${isArabic ? `تذكير ${notificationCount} - إرجاع الكتاب` : `Rappel ${notificationCount} - Retour de livre`}</h2>
        </div>
        <div class="content">
            <p>${isArabic ? `مرحباً ${userName}،` : `Bonjour ${userName},`}</p>
            <p>${isArabic ? 'هذا تذكير بأن الكتاب التالي متأخر عن موعد الإرجاع:' : 'Ceci est un rappel que le livre suivant est en retard:'}</p>
            
            <div class="book-info">
                <h3>📖 ${isArabic ? 'معلومات الكتاب' : 'Informations du livre'}</h3>
                <p><strong>${isArabic ? 'العنوان:' : 'Titre:'}</strong> ${bookTitle}</p>
                <p><strong>${isArabic ? 'المؤلف:' : 'Auteur:'}</strong> ${bookAuthor}</p>
                <p><strong>${isArabic ? 'تاريخ الاستحقاق:' : 'Date d\'échéance:'}</strong> ${dueDate.toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-DZ')}</p>
                <p><strong>${isArabic ? 'عدد الأيام المتأخرة:' : 'Jours de retard:'}</strong> <span style="color: #dc2626;">${overdueDays} ${isArabic ? 'يوم' : 'jour(s)'}</span></p>
            </div>

            <div class="warning">
                <p><strong>⚠️ ${isArabic ? 'تنبيه:' : 'Attention:'}</strong> ${isArabic ? 'يرجى إرجاع الكتاب في أقرب وقت ممكن لتجنب الغرامات الإضافية.' : 'Veuillez retourner le livre dès que possible pour éviter des amendes supplémentaires.'}</p>
            </div>

            <p>${isArabic ? 'شكراً لتعاونكم،' : 'Merci pour votre coopération,'}</p>
            <p><strong>${isArabic ? 'فريق مكتبة BiblioDz' : 'L\'équipe de la Bibliothèque BiblioDz'}</strong></p>
        </div>
        <div class="footer">
            <p>${isArabic ? 'هذا إشعار تلقائي، يرجى عدم الرد على هذا البريد الإلكتروني.' : 'Ceci est une notification automatique, veuillez ne pas répondre à cet email.'}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateFinalNoticeHtml(data: NotificationEmailData, direction: string, lang: string): string {
    const { userName, bookTitle, bookAuthor, dueDate, overdueDays } = data;
    const isArabic = lang === 'ar';
    
    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isArabic ? 'إشعار نهائي' : 'Avis Final'}</title>
    <style>
        body { font-family: ${isArabic ? 'Tahoma, Arial' : 'Arial, sans-serif'}; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .book-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .critical-warning { background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 BiblioDz</h1>
            <h2>${isArabic ? 'إشعار نهائي - إرجاع الكتاب' : 'AVIS FINAL - Retour de livre'}</h2>
        </div>
        <div class="content">
            <p>${isArabic ? `${userName} العزيز/العزيزة،` : `Cher/Chère ${userName},`}</p>
            <p><strong>${isArabic ? 'هذا إشعار نهائي بخصوص الكتاب المتأخر:' : 'Ceci est un avis final concernant votre livre en retard:'}</strong></p>
            
            <div class="book-info">
                <h3>📖 ${isArabic ? 'معلومات الكتاب' : 'Informations du livre'}</h3>
                <p><strong>${isArabic ? 'العنوان:' : 'Titre:'}</strong> ${bookTitle}</p>
                <p><strong>${isArabic ? 'المؤلف:' : 'Auteur:'}</strong> ${bookAuthor}</p>
                <p><strong>${isArabic ? 'تاريخ الاستحقاق:' : 'Date d\'échéance:'}</strong> ${dueDate.toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-DZ')}</p>
                <p><strong>${isArabic ? 'عدد الأيام المتأخرة:' : 'Jours de retard:'}</strong> <span style="color: #dc2626; font-size: 1.2em;">${overdueDays} ${isArabic ? 'يوم' : 'jour(s)'}</span></p>
            </div>

            <div class="critical-warning">
                <h3 style="color: #dc2626;">🚨 ${isArabic ? 'تحذير هام' : 'AVERTISSEMENT IMPORTANT'}</h3>
                <p><strong>${isArabic ? 'إذا لم يتم إرجاع الكتاب خلال 7 أيام:' : 'Si le livre n\'est pas retourné dans les 7 jours:'}</strong></p>
                <ul>
                    <li>${isArabic ? 'قد يتم تعليق حسابك في المكتبة' : 'Votre compte pourrait être suspendu'}</li>
                    <li>${isArabic ? 'فرض غرامات إضافية' : 'Des amendes supplémentaires seront appliquées'}</li>
                    <li>${isArabic ? 'منع الاستعارة المستقبلية' : 'Restriction des emprunts futurs'}</li>
                </ul>
                <p style="color: #dc2626;"><strong>${isArabic ? 'يرجى الاتصال بالمكتبة فوراً!' : 'Veuillez contacter la bibliothèque immédiatement!'}</strong></p>
            </div>

            <p>${isArabic ? 'نتطلع لحل هذه المسألة بسرعة،' : 'Nous espérons résoudre cette situation rapidement,'}</p>
            <p><strong>${isArabic ? 'إدارة مكتبة BiblioDz' : 'Direction de la Bibliothèque BiblioDz'}</strong></p>
        </div>
        <div class="footer">
            <p>${isArabic ? 'للاستفسارات: library@bibliodz.dz | +213 XX XX XX XX' : 'Pour toute question: library@bibliodz.dz | +213 XX XX XX XX'}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateVerificationHtml(data: VerificationEmailData, direction: string, lang: string): string {
    const { userName, userEmail, verificationToken, verificationUrl } = data;
    const isArabic = lang === 'ar';
    
    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isArabic ? 'تأكيد البريد الإلكتروني' : 'Confirmation de l\'email'}</title>
    <style>
        body { font-family: ${isArabic ? 'Tahoma, Arial' : 'Arial, sans-serif'}; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .verification-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 BiblioDz</h1>
            <h2>${isArabic ? 'تأكيد البريد الإلكتروني' : 'Confirmation de l\'email'}</h2>
        </div>
        <div class="content">
            <p>${isArabic ? `مرحباً ${userName}،` : `Bonjour ${userName},`}</p>
            <p>${isArabic ? 'يرجى الضغط على الرابط التالي لتأكيد بريدك الإلكتروني:' : 'Veuillez cliquer sur le lien suivant pour confirmer votre adresse email:'}</p>
            
            <div class="verification-info">
                <h3>📝 ${isArabic ? 'معلومات التأكيد' : 'Informations de confirmation'}</h3>
                <p><strong>${isArabic ? 'البريد الإلكتروني:' : 'Email:'}</strong> ${userEmail}</p>
                <p><strong>${isArabic ? 'رابط التأكيد:' : 'Lien de confirmation:'}</strong> <a href="${verificationUrl}?token=${verificationToken}">${verificationUrl}?token=${verificationToken}</a></p>
            </div>

            <p>${isArabic ? 'شكراً لتعاونكم،' : 'Merci pour votre coopération,'}</p>
            <p><strong>${isArabic ? 'فريق مكتبة BiblioDz' : 'L\'équipe de la Bibliothèque BiblioDz'}</strong></p>
        </div>
        <div class="footer">
            <p>${isArabic ? 'هذا إشعار تلقائي، يرجى عدم الرد على هذا البريد الإلكتروني.' : 'Ceci est une notification automatique, veuillez ne pas répondre à cet email.'}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection successful');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default new EmailService();
