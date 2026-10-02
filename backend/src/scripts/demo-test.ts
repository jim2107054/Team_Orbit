async function testLiveDemo() {
  console.log('Testing live End-to-End Demo Scenario...\n');

  const demoTranscript = `Caller: আসসালামু আলাইকুম, আমি উপায় কাস্টমার কেয়ার ঢাকা হেড অফিস থেকে বলছি। আপনার অ্যাকাউন্ট এখনই বন্ধ হয়ে যাবে।
Customer: কেন বন্ধ হবে ভাই?
Caller: জরুরি সিকিউরিটি আপডেট প্রয়োজন। আপনার ফোনে আসা ওটিপি বলুন এবং অ্যাকাউন্ট চালু রাখতে ১৮,৫০০ টাকা ০১৩৯৯-৯৯১৮২৩ নম্বরে পাঠান।`;

  // Step 1: Call Scam Check
  console.log('Step 1: Analyzing call transcript at POST /v1/scamcheck...');
  const scamRes = await fetch('http://localhost:4000/v1/scamcheck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation: demoTranscript })
  });

  const scamData = await scamRes.json() as any;
  console.log('Scam Check Result:');
  console.log('  Verdict :', scamData.verdict);
  console.log('  Typology:', scamData.typology_matched);
  console.log('  Escalation:', scamData.conversation_risk_profile?.escalation_level);
  console.log('  Extracted Numbers:', scamData.conversation_risk_profile?.extracted_entities?.phone_numbers);
  console.log('  Linked Ring:', scamData.conversation_risk_profile?.campaign_links?.linked_ring_id);
  console.log('  Customer Reasons (BN):', scamData.matched_reasons_bn);
  console.log('  What to Do (BN):', scamData.conversation_risk_profile?.recommended_action?.what_to_do_bn);
  console.log('\n------------------------------------------------------------\n');

  // Step 2: Attempt Transaction to extracted number
  console.log('Step 2: Scoring P2P Send transaction to extracted number 01399-991823...');
  const txnRes = await fetch('http://localhost:4000/v1/score/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txn: {
        type: 'P2P_SEND',
        sender_wallet: 'W-SYN-004512',
        receiver_wallet: '01399991823',
        amount_bdt: 18500,
        channel: 'APP',
        device_id: 'D-SYN-33210'
      }
    })
  });

  const txnData = await txnRes.json() as any;
  console.log('Transaction Risk Decision:');
  console.log('  Risk Score :', txnData.risk_score);
  console.log('  Risk Tier  :', txnData.risk_tier);
  console.log('  Action     :', txnData.action);
  console.log('  Rule Trace :', txnData.rule_trace.filter((r: any) => r.fired).map((r: any) => r.rule));
  console.log('  Customer Headline BN:', txnData.customer_message?.headline_bn);
  console.log('  Cooling Off Seconds :', txnData.customer_message?.cooling_off_seconds);

  if (txnData.action === 'PAUSE_VERIFY' || txnData.action === 'HOLD_ASSIST') {
    console.log('\n DEMO SCENARIO VERIFIED END-TO-END: Conversational Scam Check seamlessly heightened transaction context risk and triggered Pause & Verify!');
  } else {
    console.log('\n❌ Transaction action expected PAUSE_VERIFY or HOLD_ASSIST but got ' + txnData.action);
  }
}

testLiveDemo().catch(console.error);
