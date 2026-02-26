import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BANPARA_BASE = 'https://cotacao.banpara.b.br';
const BANPARA_LOGIN_URL = `${BANPARA_BASE}/Default.aspx`;

interface BanparaProcess {
  numero: string;
  objeto: string;
  dataLimite: string;
  tipo: string;
}

// Extract ASP.NET hidden fields (ViewState, EventValidation, etc.)
function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /<input[^>]*type="hidden"[^>]*name="([^"]*)"[^>]*value="([^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  // Also try reversed attribute order
  const regex2 = /<input[^>]*value="([^"]*)"[^>]*name="([^"]*)"[^>]*type="hidden"/g;
  while ((match = regex2.exec(html)) !== null) {
    fields[match[2]] = match[1];
  }
  return fields;
}

// Extract cookies from Set-Cookie headers
function extractCookies(response: Response): string {
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const cookiePart = value.split(';')[0];
      cookies.push(cookiePart);
    }
  });
  return cookies.join('; ');
}

// Parse processes from the public listing
function parsePublicProcesses(html: string): BanparaProcess[] {
  const processes: BanparaProcess[] = [];
  
  // Parse table rows from trListaProcessoAndamento
  const tbodyMatch = html.match(/id="trListaProcessoAndamento">([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return processes;
  
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbodyMatch[1])) !== null) {
    const cells = rowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (cells && cells.length >= 4) {
      const numero = cells[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const objeto = cells[2]?.replace(/<[^>]*>/g, '').trim() || '';
      const dataLimite = cells[3]?.replace(/<[^>]*>/g, '').trim() || '';
      const tipoImg = cells[0]?.match(/icon_([^.]*)/)?.[1] || 'CompraDireta';
      
      if (numero) {
        processes.push({
          numero,
          objeto,
          dataLimite,
          tipo: tipoImg.includes('CompraDireta') ? 'Compra Direta' : 'Cotação',
        });
      }
    }
  }
  
  return processes;
}

// Attempt login and get authenticated session
async function loginBanpara(username: string, password: string): Promise<{
  success: boolean;
  cookies: string;
  html: string;
  error?: string;
}> {
  try {
    // Step 1: GET login page to get ViewState and cookies
    console.log('[Banpará] Fetching login page...');
    const loginPageRes = await fetch(BANPARA_LOGIN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'manual',
    });
    
    const loginPageHtml = await loginPageRes.text();
    const initialCookies = extractCookies(loginPageRes);
    const hiddenFields = extractHiddenFields(loginPageHtml);
    
    console.log('[Banpará] Hidden fields:', Object.keys(hiddenFields).join(', '));
    console.log('[Banpará] ViewState length:', (hiddenFields['__VIEWSTATE'] || '').length);
    console.log('[Banpará] EventValidation length:', (hiddenFields['__EVENTVALIDATION'] || '').length);
    console.log('[Banpará] Cookies:', initialCookies);
    
    // Step 2: POST login credentials
    const formData = new URLSearchParams();
    
    // Add hidden fields, overriding __EVENTTARGET for button click simulation
    for (const [key, value] of Object.entries(hiddenFields)) {
      if (key === '__EVENTTARGET') {
        formData.append(key, 'ctl00$ctl13$btnAcessar');
      } else {
        formData.append(key, value);
      }
    }
    
    // Extract the actual button value from the page (language-dependent)
    const btnValueMatch = loginPageHtml.match(/id="ctl00_ctl13_btnAcessar"[^>]*value="([^"]*)"/);
    const btnValue = btnValueMatch?.[1] || 'Acessar';
    console.log('[Banpará] Button value:', btnValue);
    
    // Add login credentials
    formData.append('ctl00$ctl13$tbxLogin', username);
    formData.append('ctl00$ctl13$tbxSenha', password);
    formData.append('ctl00$ctl13$btnAcessar', btnValue);
    
    // Log form data keys for debugging
    const formKeys = Array.from(formData.keys());
    console.log('[Banpará] Form data keys:', formKeys.join(', '));
    console.log('[Banpará] Form body length:', formData.toString().length);
    
    console.log('[Banpará] Submitting login...');
    const loginRes = await fetch(BANPARA_LOGIN_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initialCookies,
        'Referer': BANPARA_LOGIN_URL,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Origin': BANPARA_BASE,
      },
      redirect: 'manual',
    });
    
    const newCookies = extractCookies(loginRes);
    const allCookies = [initialCookies, newCookies].filter(Boolean).join('; ');
    
    // Check if we got redirected (common after successful login)
    const location = loginRes.headers.get('location');
    console.log('[Banpará] Login response status:', loginRes.status);
    console.log('[Banpará] Redirect location:', location);
    
    let postLoginHtml = '';
    
    if (loginRes.status === 302 || loginRes.status === 301) {
      // Follow redirect with cookies
      const redirectUrl = location?.startsWith('http') ? location : `${BANPARA_BASE}${location}`;
      console.log('[Banpará] Following redirect to:', redirectUrl);
      
      const redirectRes = await fetch(redirectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': allCookies,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      postLoginHtml = await redirectRes.text();
      const moreCookies = extractCookies(redirectRes);
      const finalCookies = [allCookies, moreCookies].filter(Boolean).join('; ');
      
      return { success: true, cookies: finalCookies, html: postLoginHtml };
    } else {
      postLoginHtml = await loginRes.text();
      
      // Log the response to understand what we got
      console.log('[Banpará] Post-login HTML length:', postLoginHtml.length);
      console.log('[Banpará] Contains tbxLogin:', postLoginHtml.includes('tbxLogin'));
      console.log('[Banpará] Contains btnSair:', postLoginHtml.includes('btnSair'));
      console.log('[Banpará] Contains Sair:', postLoginHtml.includes('Sair'));
      console.log('[Banpará] Contains Logout:', postLoginHtml.includes('Logout'));
      console.log('[Banpará] Contains Log out:', postLoginHtml.includes('Log out'));
      console.log('[Banpará] Contains painelMenu:', postLoginHtml.includes('painelMenu'));
      console.log('[Banpará] Contains vsuGeral:', postLoginHtml.includes('vsuGeral'));
      console.log('[Banpará] Contains imgCaptcha (img tag):', postLoginHtml.includes('imgCaptcha'));
      console.log('[Banpará] Contains tbxCaptchaText:', postLoginHtml.includes('tbxCaptchaText'));
      console.log('[Banpará] Contains plhCaptcha visible:', postLoginHtml.includes('plhCaptcha'));
      
      // Check if there's a visible CAPTCHA
      const captchaMatch = postLoginHtml.match(/imgCaptcha[^>]*src="([^"]*)"/);
      console.log('[Banpará] CAPTCHA image src:', captchaMatch?.[1] || 'not found');
      
      // Check vsuGeral error div content
      const errorDivMatch = postLoginHtml.match(/id="vsuGeral"[^>]*>([\s\S]*?)<\/div>/);
      const errorContent = errorDivMatch?.[1]?.replace(/<[^>]*>/g, '').trim();
      console.log('[Banpará] vsuGeral content:', errorContent || 'empty');
      
      // Extract actual login section HTML
      const divLoginMatch = postLoginHtml.match(/id="divLogin">([\s\S]*?)<\/div>/);
      console.log('[Banpará] divLogin content:', divLoginMatch?.[1]?.substring(0, 300) || 'not found');
      
      // Check for captcha section
      const captchaSection = postLoginHtml.match(/Captcha([\s\S]{0,500})/);
      console.log('[Banpará] Captcha section:', captchaSection?.[1]?.substring(0, 300) || 'none');
      
      // Check for successful login indicators
      const loggedIn = postLoginHtml.includes('btnSair') || 
                       postLoginHtml.includes('Sair') || 
                       postLoginHtml.includes('Logout') ||
                       postLoginHtml.includes('Log out') ||
                       postLoginHtml.includes('Bem-vindo') ||
                       postLoginHtml.includes('Welcome');
      
      if (loggedIn) {
        return { success: true, cookies: allCookies, html: postLoginHtml };
      }
      
      // Check if login form is still visible (login failed)
      if (postLoginHtml.includes('tbxLogin') && postLoginHtml.includes('tbxSenha')) {
        // Check for specific error messages
        const errorMatch = postLoginHtml.match(/vsuGeral[^>]*style="[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const errorText = errorMatch?.[1]?.replace(/<[^>]*>/g, '').trim();
        console.log('[Banpará] Error message:', errorText || 'none visible');
        
        return { success: false, cookies: '', html: postLoginHtml, error: errorText || 'Login form still present - authentication may have failed' };
      }
      
      // If we got here, assume success (page changed)
      return { success: true, cookies: allCookies, html: postLoginHtml };
    }
  } catch (error) {
    console.error('[Banpará] Login error:', error);
    return { success: false, cookies: '', html: '', error: String(error) };
  }
}

// Fetch cotações page after authentication
async function fetchCotacoes(cookies: string): Promise<BanparaProcess[]> {
  const processes: BanparaProcess[] = [];
  
  try {
    // Try common URLs for listing cotações after login
    const urls = [
      `${BANPARA_BASE}/Comprador/Processo/Listar.aspx`,
      `${BANPARA_BASE}/Fornecedor/Processo/Listar.aspx`,
      `${BANPARA_BASE}/Fornecedor/Cotacao/Listar.aspx`,
      `${BANPARA_BASE}/Portal/Processo/Listar.aspx`,
    ];
    
    for (const url of urls) {
      try {
        console.log('[Banpará] Trying:', url);
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        
        if (res.ok) {
          const html = await res.text();
          // Check if we're still logged in
          if (html.includes('tbxLogin') && !html.includes('btnSair')) {
            console.log('[Banpará] Session expired at', url);
            continue;
          }
          
          console.log('[Banpará] Page loaded:', url, 'size:', html.length);
          
          // Parse processes from authenticated page
          const parsed = parseAuthenticatedProcesses(html);
          if (parsed.length > 0) {
            processes.push(...parsed);
            break;
          }
        } else {
          await res.text(); // consume body
        }
      } catch (e) {
        console.log('[Banpará] Error fetching', url, e);
      }
    }
  } catch (error) {
    console.error('[Banpará] Error fetching cotações:', error);
  }
  
  return processes;
}

// Parse processes from authenticated pages
function parseAuthenticatedProcesses(html: string): BanparaProcess[] {
  const processes: BanparaProcess[] = [];
  
  // Try to find a grid/table with processes
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let match;
  
  while ((match = tableRegex.exec(html)) !== null) {
    const row = match[1];
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    
    if (cells && cells.length >= 3) {
      const texts = cells.map(c => c.replace(/<[^>]*>/g, '').trim());
      
      // Look for process number patterns (YYYY/NNNNNNN)
      const processNumMatch = texts.find(t => /\d{4}\/\d{5,}/.test(t));
      if (processNumMatch) {
        const numero = processNumMatch.match(/(\d{4}\/\d{5,})/)?.[1] || '';
        const objeto = texts.find(t => t.length > 30) || '';
        const dataMatch = texts.find(t => /\d{1,2}\/\d{1,2}\/\d{4}/.test(t));
        
        processes.push({
          numero,
          objeto,
          dataLimite: dataMatch || '',
          tipo: 'Cotação Banpará',
        });
      }
    }
  }
  
  return processes;
}

// Convert Banpará date string to ISO
function parseBanparaDate(dateStr: string): string {
  try {
    // Format: "3/5/2026 10:00 AM" (US format from English page)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {}
  
  // Try BR format: "05/03/2026 10:00"
  try {
    const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (parts) {
      return new Date(`${parts[3]}-${parts[2]}-${parts[1]}T${parts[4]}:${parts[5]}:00`).toISOString();
    }
  } catch {}
  
  return new Date().toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BANPARA_USER = Deno.env.get('BANPARA_USER');
    const BANPARA_PASSWORD = Deno.env.get('BANPARA_PASSWORD');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!BANPARA_USER || !BANPARA_PASSWORD) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais Banpará não configuradas (BANPARA_USER / BANPARA_PASSWORD)',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[Banpará] === Starting capture ===');

    // Step 1: Get public processes (always works)
    console.log('[Banpará] Fetching public processes...');
    const publicPageRes = await fetch(BANPARA_LOGIN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    const publicHtml = await publicPageRes.text();
    const publicProcesses = parsePublicProcesses(publicHtml);
    console.log('[Banpará] Public processes found:', publicProcesses.length);

    // Step 2: Attempt authenticated login
    console.log('[Banpará] Attempting login...');
    const loginResult = await loginBanpara(BANPARA_USER, BANPARA_PASSWORD);
    
    let authenticatedProcesses: BanparaProcess[] = [];
    if (loginResult.success) {
      console.log('[Banpará] Login successful! Fetching authenticated cotações...');
      
      // Parse processes from post-login page
      authenticatedProcesses = parseAuthenticatedProcesses(loginResult.html);
      
      // Also try fetching specific pages
      if (authenticatedProcesses.length === 0) {
        authenticatedProcesses = await fetchCotacoes(loginResult.cookies);
      }
      
      console.log('[Banpará] Authenticated processes found:', authenticatedProcesses.length);
    } else {
      console.warn('[Banpará] Login failed:', loginResult.error);
    }

    // Merge all processes (authenticated take priority)
    const allProcesses = [...authenticatedProcesses];
    for (const pub of publicProcesses) {
      if (!allProcesses.find(p => p.numero === pub.numero)) {
        allProcesses.push(pub);
      }
    }

    console.log('[Banpará] Total unique processes:', allProcesses.length);

    // Step 3: Save to database
    let inserted = 0;
    for (const proc of allProcesses) {
      const dataLimite = parseBanparaDate(proc.dataLimite);
      const dataAbertura = new Date().toISOString();

      const { error } = await supabase.from('licitacoes').upsert({
        numero: `BANPARA-${proc.numero}`,
        portal: 'Portal Estadual' as const,
        orgao: 'Banpará - Portal de Compras Eletrônicas',
        municipio: 'Belém',
        uf: 'PA',
        objeto: proc.objeto,
        objeto_resumido: proc.objeto.substring(0, 100),
        valor: 0, // Banpará doesn't always show value upfront
        modalidade: 'Compra Direta' as const,
        segmento: detectSegmento(proc.objeto),
        data_abertura: dataAbertura,
        data_limite: dataLimite,
        status: 'Nova' as const,
        metodo_envio: 'portal',
      }, {
        onConflict: 'numero',
        ignoreDuplicates: true,
      });

      if (!error) {
        inserted++;
      } else if (!error.message.includes('duplicate')) {
        console.error('[Banpará] Insert error:', error.message);
      }
    }

    console.log('[Banpará] Inserted:', inserted, 'of', allProcesses.length);

    return new Response(JSON.stringify({
      success: true,
      loginSuccess: loginResult.success,
      loginError: loginResult.error || null,
      publicProcesses: publicProcesses.length,
      authenticatedProcesses: authenticatedProcesses.length,
      totalProcesses: allProcesses.length,
      inserted,
      processes: allProcesses.map(p => ({
        numero: p.numero,
        objeto: p.objeto.substring(0, 80) + '...',
        dataLimite: p.dataLimite,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Banpará] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function detectSegmento(objeto: string): 'Medicamentos' | 'Empreendimentos' {
  const lower = objeto.toLowerCase();
  const medTerms = ['medicamento', 'farmac', 'hospitalar', 'saúde', 'médic', 'odontológ', 'cânula', 'material técnico hospitalar', 'pulseira'];
  if (medTerms.some(t => lower.includes(t))) return 'Medicamentos';
  return 'Empreendimentos';
}
