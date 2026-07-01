import IconContrast from '@tabler/icons-react/dist/esm/icons/IconContrast.mjs';
import IconContrast2 from '@tabler/icons-react/dist/esm/icons/IconContrast2.mjs';
import IconDeviceDesktop from '@tabler/icons-react/dist/esm/icons/IconDeviceDesktop.mjs';
import IconMoon from '@tabler/icons-react/dist/esm/icons/IconMoon.mjs';
import IconSun from '@tabler/icons-react/dist/esm/icons/IconSun.mjs';

const ICON_SIZE = 17;
const ICON_STROKE = 1.75;

function SegButton({ pressed, label, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Seg({ id, label, value, options, onChange }) {
  return (
    <div className="seg" id={id} role="group" aria-label={label}>
      {options.map((opt) => (
        <SegButton
          key={opt.value}
          pressed={value === opt.value}
          label={opt.label}
          onClick={() => onChange(opt.value)}
        >
          <opt.Icon size={ICON_SIZE} stroke={ICON_STROKE} aria-hidden />
        </SegButton>
      ))}
    </div>
  );
}

export function Toggles({ scheme, contrast, onSchemeChange, onContrastChange }) {
  return (
    <>
      <Seg
        id="seg-scheme"
        label="Color scheme"
        value={scheme}
        onChange={onSchemeChange}
        options={[
          { value: 'system', label: 'System', Icon: IconDeviceDesktop },
          { value: 'light', label: 'Light', Icon: IconSun },
          { value: 'dark', label: 'Dark', Icon: IconMoon },
        ]}
      />
      <Seg
        id="seg-contrast"
        label="Contrast"
        value={contrast}
        onChange={onContrastChange}
        options={[
          { value: 'system', label: 'System', Icon: IconDeviceDesktop },
          { value: 'normal', label: 'Normal', Icon: IconContrast },
          { value: 'high', label: 'High', Icon: IconContrast2 },
        ]}
      />
    </>
  );
}
