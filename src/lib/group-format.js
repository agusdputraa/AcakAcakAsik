export function formatGroups(groups) {
    return groups.map(group => `[${group.name.replaceAll(']', ')')}]
${group.members.map(member => '- ' + (typeof member === 'string' ? member : member.name)).join('\n')}`).join('\n\n');
}
export function parseGroups(text) {
    const groups = [];
    let current;
    for (const [index, raw] of text.split(/\r?\n/).entries()) {
        const line = raw.trim();
        if (!line || line === 'Hasil Pembagian Kelompok') continue;
        if (line.startsWith('[') && line.endsWith(']')) {
            current = { name: line.slice(1, -1).trim(), members: [] };
            groups.push(current);
        } else if (line.includes(' · ')) {
            const [name, ...rest] = line.split(' · ');
            current = { name: name.trim(), members: rest.join(' · ').split(',').map(value => value.trim()).filter(Boolean) };
            groups.push(current);
        } else if (/^[-*]\s+/.test(line) && current) {
            current.members.push(line.replace(/^[-*]\s+/, ''));
        } else {
            return { groups: [], error: `Baris ${index + 1} belum sesuai. Gunakan [Nama Kelompok], lalu - Nama anggota.` };
        }
    }
    if (groups.some(group => !group.name || !group.members.length)) return { groups: [], error: 'Setiap kelompok harus memiliki nama dan minimal satu anggota.' };
    return { groups, error: '' };
}
