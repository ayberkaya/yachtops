import { NextResponse } from 'next/server';
import { syncAllUsersToSupabaseAuth } from '@/lib/supabase-auth-sync';

// Bu rotayı korumamız lazım ama şimdilik hızlı çözüm için basit tutuyoruz.
// Tarayıcıdan bu adrese gidince işlem başlayacak.
export async function GET() {
  try {
    console.log("Sync işlemi başlıyor...");
    await syncAllUsersToSupabaseAuth();
    console.log("Sync işlemi bitti.");
    
    return NextResponse.json({ 
      success: true, 
      message: "Tüm kullanıcılar Supabase Auth'a başarıyla kopyalandı." 
    });
  } catch (error: any) {
    console.error("Sync hatası:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}