module certchain_addr::certchain {
    use std::string::String;
    use std::vector;
    use aptos_framework::signer;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // Errors
    const EPROFILE_ALREADY_EXISTS: u64 = 1;
    const EPROFILE_DOES_NOT_EXIST: u64 = 2;
    const EORG_ALREADY_EXISTS: u64 = 3;
    const EORG_DOES_NOT_EXIST: u64 = 4;
    const ECAMPAIGN_REGISTRY_DOES_NOT_EXIST: u64 = 5;
    const ENOT_ORG_OWNER: u64 = 6;
    const ECERTIFICATE_DOES_NOT_EXIST: u64 = 7;
    const EVECTOR_LENGTH_MISMATCH: u64 = 8;
    const EUSER_CERTS_NOT_INITIALIZED: u64 = 9;

    struct Profile has key, copy, drop, store {
        name: String,
        bio: String,
        twitter: String,
        github: String,
        created_at: u64,
    }

    struct Organization has key, copy, drop, store {
        name: String,
        desc: String,
        website: String,
        owner: address,
        created_at: u64,
    }

    struct Campaign has copy, drop, store {
        id: u64,
        name: String,
        desc: String,
        created_at: u64,
    }

    struct CampaignRegistry has key {
        campaigns: vector<Campaign>,
        next_campaign_id: u64,
    }

    struct Certificate has copy, drop, store {
        id: u64,
        campaign_id: u64,
        issuer: address,
        blob_url: String,
        issued_at: u64,
    }

    struct UserCertificates has key {
        certs: vector<Certificate>,
        next_cert_id: u64,
    }

    // Events
    #[event]
    struct ProfileCreatedEvent has drop, store {
        user: address,
        name: String,
        created_at: u64,
    }

    #[event]
    struct OrganizationCreatedEvent has drop, store {
        owner: address,
        name: String,
        created_at: u64,
    }

    #[event]
    struct CampaignCreatedEvent has drop, store {
        org: address,
        campaign_id: u64,
        name: String,
        created_at: u64,
    }

    #[event]
    struct CertificateIssuedEvent has drop, store {
        id: u64,
        recipient: address,
        issuer: address,
        campaign_id: u64,
        blob_url: String,
        issued_at: u64,
    }

    #[event]
    struct CertificateRevokedEvent has drop, store {
        id: u64,
        recipient: address,
        issuer: address,
        revoked_at: u64,
    }

    // --- Profile Functions ---

    public entry fun create_profile(
        account: &signer,
        name: String,
        bio: String,
        twitter: String,
        github: String
    ) {
        let addr = signer::address_of(account);
        assert!(!exists<Profile>(addr), EPROFILE_ALREADY_EXISTS);

        let created_at = timestamp::now_seconds();
        let profile = Profile {
            name,
            bio,
            twitter,
            github,
            created_at,
        };
        move_to(account, profile);

        // Auto-initialize recipient certificate registry for SBTs
        if (!exists<UserCertificates>(addr)) {
            move_to(account, UserCertificates {
                certs: vector::empty<Certificate>(),
                next_cert_id: 1,
            });
        };

        event::emit(ProfileCreatedEvent {
            user: addr,
            name,
            created_at,
        });
    }

    public entry fun edit_profile(
        account: &signer,
        name: String,
        bio: String,
        twitter: String,
        github: String
    ) acquires Profile {
        let addr = signer::address_of(account);
        assert!(exists<Profile>(addr), EPROFILE_DOES_NOT_EXIST);

        let profile = borrow_global_mut<Profile>(addr);
        profile.name = name;
        profile.bio = bio;
        profile.twitter = twitter;
        profile.github = github;
    }

    // Manual initializer in case someone wants to receive certificates without profile
    public entry fun initialize_certificates(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<UserCertificates>(addr)) {
            move_to(account, UserCertificates {
                certs: vector::empty<Certificate>(),
                next_cert_id: 1,
            });
        };
    }

    // --- Organization & Campaign Functions ---

    public entry fun create_organization(
        account: &signer,
        name: String,
        desc: String,
        website: String
    ) {
        let addr = signer::address_of(account);
        assert!(!exists<Organization>(addr), EORG_ALREADY_EXISTS);

        let created_at = timestamp::now_seconds();
        let org = Organization {
            name,
            desc,
            website,
            owner: addr,
            created_at,
        };
        move_to(account, org);

        let registry = CampaignRegistry {
            campaigns: vector::empty<Campaign>(),
            next_campaign_id: 1,
        };
        move_to(account, registry);

        event::emit(OrganizationCreatedEvent {
            owner: addr,
            name,
            created_at,
        });
    }

    public entry fun create_campaign(
        account: &signer,
        name: String,
        desc: String
    ) acquires CampaignRegistry {
        let addr = signer::address_of(account);
        assert!(exists<Organization>(addr), EORG_DOES_NOT_EXIST);
        assert!(exists<CampaignRegistry>(addr), ECAMPAIGN_REGISTRY_DOES_NOT_EXIST);

        let registry = borrow_global_mut<CampaignRegistry>(addr);
        let campaign_id = registry.next_campaign_id;
        let created_at = timestamp::now_seconds();

        let campaign = Campaign {
            id: campaign_id,
            name,
            desc,
            created_at,
        };

        vector::push_back(&mut registry.campaigns, campaign);
        registry.next_campaign_id = campaign_id + 1;

        event::emit(CampaignCreatedEvent {
            org: addr,
            campaign_id,
            name,
            created_at,
        });
    }

    // --- Certificate SBT Functions ---

    fun issue_certificate_internal(
        org_addr: address,
        recipient: address,
        campaign_id: u64,
        blob_url: String
    ) acquires UserCertificates {
        assert!(exists<UserCertificates>(recipient), EUSER_CERTS_NOT_INITIALIZED);
        
        let user_certs = borrow_global_mut<UserCertificates>(recipient);
        let cert_id = user_certs.next_cert_id;
        let issued_at = timestamp::now_seconds();
        
        let cert = Certificate {
            id: cert_id,
            campaign_id,
            issuer: org_addr,
            blob_url,
            issued_at,
        };
        
        vector::push_back(&mut user_certs.certs, cert);
        user_certs.next_cert_id = cert_id + 1;

        event::emit(CertificateIssuedEvent {
            id: cert_id,
            recipient,
            issuer: org_addr,
            campaign_id,
            blob_url,
            issued_at,
        });
    }

    public entry fun issue_certificate(
        org_account: &signer,
        recipient: address,
        campaign_id: u64,
        blob_url: String
    ) acquires UserCertificates {
        let org_addr = signer::address_of(org_account);
        assert!(exists<Organization>(org_addr), EORG_DOES_NOT_EXIST);
        issue_certificate_internal(org_addr, recipient, campaign_id, blob_url);
    }

    public entry fun batch_issue_certificates(
        org_account: &signer,
        recipients: vector<address>,
        campaign_id: u64,
        blob_urls: vector<String>
    ) acquires UserCertificates {
        let org_addr = signer::address_of(org_account);
        assert!(exists<Organization>(org_addr), EORG_DOES_NOT_EXIST);
        
        let len = vector::length(&recipients);
        assert!(len == vector::length(&blob_urls), EVECTOR_LENGTH_MISMATCH);
        
        let i = 0;
        while (i < len) {
            let recipient = *vector::borrow(&recipients, i);
            let blob_url = *vector::borrow(&blob_urls, i);
            issue_certificate_internal(org_addr, recipient, campaign_id, blob_url);
            i = i + 1;
        };
    }

    public entry fun revoke_certificate(
        org_account: &signer,
        recipient: address,
        certificate_id: u64
    ) acquires UserCertificates {
        let org_addr = signer::address_of(org_account);
        assert!(exists<Organization>(org_addr), EORG_DOES_NOT_EXIST);
        assert!(exists<UserCertificates>(recipient), EUSER_CERTS_NOT_INITIALIZED);

        let user_certs = borrow_global_mut<UserCertificates>(recipient);
        let len = vector::length(&user_certs.certs);
        let i = 0;
        let found = false;
        
        while (i < len) {
            let cert = vector::borrow(&user_certs.certs, i);
            if (cert.id == certificate_id && cert.issuer == org_addr) {
                vector::remove(&mut user_certs.certs, i);
                found = true;
                break;
            };
            i = i + 1;
        };
        
        assert!(found, ECERTIFICATE_DOES_NOT_EXIST);

        event::emit(CertificateRevokedEvent {
            id: certificate_id,
            recipient,
            issuer: org_addr,
            revoked_at: timestamp::now_seconds(),
        });
    }

    // --- View Functions (useful for SDK queries if needed, though resource reading is standard) ---
    
    #[view]
    public fun has_profile(addr: address): bool {
        exists<Profile>(addr)
    }

    #[view]
    public fun get_profile(addr: address): (String, String, String, String, u64) acquires Profile {
        assert!(exists<Profile>(addr), EPROFILE_DOES_NOT_EXIST);
        let profile = borrow_global<Profile>(addr);
        (profile.name, profile.bio, profile.twitter, profile.github, profile.created_at)
    }

    #[view]
    public fun has_organization(addr: address): bool {
        exists<Organization>(addr)
    }

    #[view]
    public fun get_organization(addr: address): (String, String, String, address, u64) acquires Organization {
        assert!(exists<Organization>(addr), EORG_DOES_NOT_EXIST);
        let org = borrow_global<Organization>(addr);
        (org.name, org.desc, org.website, org.owner, org.created_at)
    }

    #[view]
    public fun get_campaigns(addr: address): vector<Campaign> acquires CampaignRegistry {
        assert!(exists<CampaignRegistry>(addr), ECAMPAIGN_REGISTRY_DOES_NOT_EXIST);
        let registry = borrow_global<CampaignRegistry>(addr);
        registry.campaigns
    }

    #[view]
    public fun get_certificates(addr: address): vector<Certificate> acquires UserCertificates {
        assert!(exists<UserCertificates>(addr), EUSER_CERTS_NOT_INITIALIZED);
        let user_certs = borrow_global<UserCertificates>(addr);
        user_certs.certs
    }
}
