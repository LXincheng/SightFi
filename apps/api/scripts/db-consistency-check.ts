import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const stamp = `sightfi-${Date.now()}`;
  const email = `${stamp}@example.com`;

  const created = await prisma.user.create({
    data: {
      email,
      displayName: 'Consistency Check User',
    },
  });

  const { data: remoteUsers, error: remoteUserError } = await supabase
    .from('users')
    .select('id,email')
    .eq('id', created.id)
    .limit(1);

  if (remoteUserError) {
    throw new Error(`Supabase read users failed: ${remoteUserError.message}`);
  }
  if (!remoteUsers || remoteUsers.length !== 1) {
    throw new Error('Supabase user read mismatch: user not found');
  }

  const memoryKey = `check-${stamp}`;
  const { error: memoryInsertError } = await supabase.from('user_memories').insert({
    userId: created.id,
    category: 'STRATEGY_NOTE',
    key: memoryKey,
    value: { note: 'consistency-check' },
  });

  if (memoryInsertError) {
    throw new Error(
      `Supabase write user_memories failed: ${memoryInsertError.message}`,
    );
  }

  const memory = await prisma.userMemory.findFirst({
    where: {
      userId: created.id,
      key: memoryKey,
    },
    select: {
      id: true,
      key: true,
    },
  });

  if (!memory) {
    throw new Error('Prisma read mismatch: inserted memory not found');
  }

  await prisma.userMemory.delete({ where: { id: memory.id } });
  await prisma.user.delete({ where: { id: created.id } });

  console.log('DB consistency check passed');
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`DB consistency check failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
