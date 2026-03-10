# from .base import Base
# from sqlalchemy import Column, ForeignKey, String, Float
# import uuid

# class AssociationRule(Base): 
#     __tablename__ = 'association_rules'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

#     text_object = Column(String(36), nullable=False)
#     workspace_id = Column(String(36), ForeignKey('workspaces.id'), nullable=False)
    
#     antecedents = Column(String(255), nullable=False)
#     consequents = Column(String(255), nullable=False)
#     support = Column(Float, nullable=False)
#     confidence = Column(Float, nullable=False)
#     lift = Column(Float, nullable=False)

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

# # Xem xét việc triển khai thêm association_rule cho toàn hệ thống hoặc cho workspace
# # Hiện tại sẽ chỉ triển khai cho workspace để đơn giản hóa hệ thống

# #     "antecedents": list(row["antecedents"]), # item xh trc trong rule, vd {manage} -> {admin} ->antecedents: manage
# #     #Ketqua
# #     "consequents": list(row["consequents"]), # item xh sau trong rule, vd {manage} -> {admin} ->consequents: admin
# #     "support": float(row["support"]), # tỷ lệ transaction có chứa cả antecedents + consequents.
# #     "confidence": float(row["confidence"]), #nếu antecedents xuất hiện, xác suất consequents cũng xuất hiện
# #     "lift": float(row["lift"])
