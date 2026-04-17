public with sharing class ProductSelectionController  {

   @AuraEnabled(cacheable=true)
public static String getProducts(Id opportunityId) {

    List<ProductWrapper> wrapList = new List<ProductWrapper>();

    List<PricebookEntry> allProducts = [
        SELECT Id,
               UnitPrice,
               Product2.Name,
               Product2.Description,
               Product2.HSN_Code__c,
               Product2.ProductCode,
               Product2.Category__c,
               Product2.Product_Type__c,
               Product2.Subcategory__c
        FROM PricebookEntry
        WHERE IsActive = true
        AND Pricebook2Id IN (
            SELECT Pricebook2Id FROM Opportunity WHERE Id = :opportunityId
        )
    ];

    List<OpportunityLineItem> oliList = [
    SELECT Id, PricebookEntryId, Remarks__c
    FROM OpportunityLineItem
    WHERE OpportunityId = :opportunityId
];

Map<Id, OpportunityLineItem> oliMap = new Map<Id, OpportunityLineItem>();

for(OpportunityLineItem oli : oliList){
    oliMap.put(oli.PricebookEntryId, oli);
}


    for(PricebookEntry pbe : allProducts){

        ProductWrapper pw = new ProductWrapper();

        pw.pbeId = pbe.Id;
        pw.productName = pbe.Product2.Name;
        pw.productId = pbe.Product2.Id;
        pw.productDescription = pbe.Product2.Description;
        pw.HSNCode = pbe.Product2.HSN_Code__c;
        pw.productCode= pbe.Product2.ProductCode;
        pw.category = pbe.Product2.Category__c;
        pw.productType = pbe.Product2.Product_Type__c;
        pw.subcategory = pbe.Product2.Subcategory__c;
        pw.unitPrice = pbe.UnitPrice;

        if(oliMap.containsKey(pbe.Id)){
        pw.remarks = oliMap.get(pbe.Id).Remarks__c;
        } 
        else {
        pw.remarks = '';
        }
        

        wrapList.add(pw);
    }

return JSON.serialize(wrapList);

}

    @AuraEnabled
    public static void createOpportunityProducts(String productJson){

        List<ProductWrapper> wrapperList =
        (List<ProductWrapper>) JSON.deserialize(productJson, List<ProductWrapper>.class);

        List<OpportunityLineItem> oliList = new List<OpportunityLineItem>();

        for(ProductWrapper pw : wrapperList){

            OpportunityLineItem oli = new OpportunityLineItem();

            oli.OpportunityId = pw.opportunityId;
            oli.PricebookEntryId = pw.pbeId;
            oli.Quantity = pw.quantity;
            oli.UnitPrice = pw.unitPrice;
            oli.Description = pw.description;
            oli.Remarks__c = pw.remarks;

            oliList.add(oli);
        }
        if(!oliList.isEmpty()){
            insert oliList;
        }

    }


    public class ProductWrapper {

        @AuraEnabled public Id pbeId {get; set;}
        @AuraEnabled public String productName {get; set;}
        @AuraEnabled public String productCode {get; set;}
        @AuraEnabled public String productDescription {get; set;}
        @AuraEnabled public String productId {get; set;}
        @AuraEnabled public String HSNCode {get; set;}
        @AuraEnabled public String category {get; set;}
        @AuraEnabled public String productType {get; set;}
        @AuraEnabled public String subcategory {get; set;}
        @AuraEnabled public Decimal unitPrice {get; set;}

        @AuraEnabled public Id opportunityId {get;set;}
        @AuraEnabled public Decimal quantity {get; set;}
        @AuraEnabled public String description {get; set;}
        @AuraEnabled public String remarks {get; set;}
    }
}