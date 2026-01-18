program vote_privacy_2985.aleo;

record VoteReceipt:
    owner as address.private;
    campaign_id as u64.private;
    option_index as u8.private;
    timestamp as u64.private;

struct Campaign:
    creator as address;
    metadata_hash as field;
    start_time as u64;
    end_time as u64;
    option_count as u8;
    total_votes as u64;
    is_active as boolean;
    votes_0 as u64;
    votes_1 as u64;
    votes_2 as u64;
    votes_3 as u64;

mapping campaign_counter:
    key as u8.public;
    value as u64.public;

mapping campaigns:
    key as u64.public;
    value as Campaign.public;

mapping has_voted:
    key as field.public;
    value as boolean.public;

function create_campaign:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as u8.public;
    gt r2 r1 into r4;
    assert.eq r4 true;
    gte r3 2u8 into r5;
    lte r3 4u8 into r6;
    and r5 r6 into r7;
    assert.eq r7 true;
    async create_campaign self.caller r0 r1 r2 r3 into r8;
    output r8 as vote_privacy_2985.aleo/create_campaign.future;

finalize create_campaign:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as u64.public;
    input r4 as u8.public;
    get.or_use campaign_counter[0u8] 0u64 into r5;
    add r5 1u64 into r6;
    set r6 into campaign_counter[0u8];
    cast r0 r1 r2 r3 r4 0u64 true 0u64 0u64 0u64 0u64 into r7 as Campaign;
    set r7 into campaigns[r6];

function cast_vote:
    input r0 as u64.public;
    input r1 as u8.public;
    input r2 as u64.private;
    lt r1 4u8 into r3;
    assert.eq r3 true;
    cast self.caller r0 r1 r2 into r4 as VoteReceipt.record;
    hash.bhp256 self.caller into r5 as field;
    async cast_vote r0 r1 r5 into r6;
    output r4 as VoteReceipt.record;
    output r6 as vote_privacy_2985.aleo/cast_vote.future;

finalize cast_vote:
    input r0 as u64.public;
    input r1 as u8.public;
    input r2 as field.public;
    get campaigns[r0] into r3;
    assert.eq r3.is_active true;
    lt r1 r3.option_count into r4;
    assert.eq r4 true;
    cast r0 into r5 as field;
    add r5 r2 into r6;
    hash.bhp256 r6 into r7 as field;
    get.or_use has_voted[r7] false into r8;
    not r8 into r9;
    assert.eq r9 true;
    set true into has_voted[r7];
    is.eq r1 0u8 into r10;
    ternary r10 1u64 0u64 into r11;
    add r3.votes_0 r11 into r12;
    is.eq r1 1u8 into r13;
    ternary r13 1u64 0u64 into r14;
    add r3.votes_1 r14 into r15;
    is.eq r1 2u8 into r16;
    ternary r16 1u64 0u64 into r17;
    add r3.votes_2 r17 into r18;
    is.eq r1 3u8 into r19;
    ternary r19 1u64 0u64 into r20;
    add r3.votes_3 r20 into r21;
    add r3.total_votes 1u64 into r22;
    cast r3.creator r3.metadata_hash r3.start_time r3.end_time r3.option_count r22 r3.is_active r12 r15 r18 r21 into r23 as Campaign;
    set r23 into campaigns[r0];

function end_campaign:
    input r0 as u64.public;
    async end_campaign r0 self.caller into r1;
    output r1 as vote_privacy_2985.aleo/end_campaign.future;

finalize end_campaign:
    input r0 as u64.public;
    input r1 as address.public;
    get campaigns[r0] into r2;
    assert.eq r2.creator r1;
    cast r2.creator r2.metadata_hash r2.start_time r2.end_time r2.option_count r2.total_votes false r2.votes_0 r2.votes_1 r2.votes_2 r2.votes_3 into r3 as Campaign;
    set r3 into campaigns[r0];

function verify_vote_participation:
    input r0 as VoteReceipt.record;
    output true as boolean.private;

constructor:
    assert.eq edition 0u16;
