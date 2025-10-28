# backend/services/notification_service.py

"""
Bildirim Servisi - Email ve in-app notifications
"""

import logging
import os
from typing import Optional
from sqlalchemy.orm import Session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Content, Email as SendGridEmail

import models
import schemas

logger = logging.getLogger(__name__)


class NotificationService:
    """SendGrid tabanlı bildirim servisi"""
    
    def __init__(self):
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.sendgrid_from_email = os.getenv('SENDGRID_FROM_EMAIL', 'no-reply@karbonuyum.com')
        
        if self.sendgrid_api_key:
            self.sg_client = SendGridAPIClient(self.sendgrid_api_key)
        else:
            self.sg_client = None
            logger.warning("⚠️ SendGrid API Key bulunamadı. Email gönderimi devre dışı.")
    
    def create_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        company_id: Optional[int] = None,
        facility_id: Optional[int] = None,
        action_url: Optional[str] = None,
        send_email: bool = True
    ) -> models.Notification:
        """
        Bildirim oluştur ve (istenirse) email gönder
        """
        # Veritabanına kayıt
        notification = models.Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            company_id=company_id,
            facility_id=facility_id,
            action_url=action_url
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Email gönder
        if send_email:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                self.send_email_notification(
                    user.email,
                    title,
                    message,
                    action_url
                )
        
        logger.info(f"✅ Bildirim oluşturuldu: {title} → {user_id}")
        return notification
    
    def send_email_notification(
        self,
        to_email: str,
        subject: str,
        message: str,
        action_url: Optional[str] = None
    ) -> bool:
        """
        SendGrid üzerinden email gönder
        """
        if not self.sg_client:
            logger.warning("⚠️ SendGrid client aktif değil, email gönderilemedi")
            return False
        
        try:
            # HTML Template oluştur
            html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); 
                            color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="margin: 0;">{subject}</h2>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.5;">
                        {message}
                    </p>
                </div>
                
                {f'''
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{action_url}" 
                       style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); 
                               color: white; padding: 12px 24px; 
                               text-decoration: none; border-radius: 6px; 
                               display: inline-block; font-weight: bold;">
                        Detaylara Git
                    </a>
                </div>
                ''' if action_url else ''}
                
                <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; 
                            color: #666; font-size: 12px; text-align: center;">
                    <p>KarbonUyum - Sürdürülebilir Gelecek İçin Akıllı Çözümler</p>
                </div>
            </div>
            """
            
            # Mail oluştur
            message = Mail(
                from_email=self.sendgrid_from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            # Gönder
            response = self.sg_client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email gönderildi: {to_email} - {subject}")
                return True
            else:
                logger.error(f"❌ Email gönderilemedi: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Email gönderimi hatası: {e}")
            return False
    
    def get_unread_notifications(
        self,
        db: Session,
        user_id: int,
        limit: int = 20
    ) -> list:
        """Okunmamış bildirimler"""
        return db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False
        ).order_by(
            models.Notification.created_at.desc()
        ).limit(limit).all()
    
    def get_all_notifications(
        self,
        db: Session,
        user_id: int,
        limit: int = 50
    ) -> list:
        """Tüm bildirimler"""
        return db.query(models.Notification).filter(
            models.Notification.user_id == user_id
        ).order_by(
            models.Notification.created_at.desc()
        ).limit(limit).all()
    
    def mark_as_read(
        self,
        db: Session,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Bildirimi oku olarak işaretle"""
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            db.commit()
            return True
        return False
    
    def delete_notification(
        self,
        db: Session,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Bildirimi sil"""
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == user_id
        ).first()
        
        if notification:
            db.delete(notification)
            db.commit()
            return True
        return False


# Singleton instance
_notification_service = None

def get_notification_service() -> NotificationService:
    """Notification servisi singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
