import { SearchBox } from './SearchBox';

/** "Give All You Need" tab: a white panel with rounded top corners that overlaps the bottom of the banner. */
export function ShopSearchBar({ defaultValue, hidden = {} }: { defaultValue?: string; hidden?: Record<string, string | undefined> }) {
  return (
    <div className="relative z-10 -mt-7 rounded-t-[22px] bg-white pt-4 md:-mt-9 md:pt-5">
      <div className="container-x">
        <div className="flex items-center gap-3 sm:gap-5">
          <p className="hidden shrink-0 text-[15px] font-bold sm:block md:text-[17px]">Give All You Need</p>
          <div className="min-w-0 flex-1 rounded-full border border-line bg-white py-0 pl-4 pr-1 sm:ml-auto sm:max-w-[440px]">
            <SearchBox defaultValue={defaultValue} hidden={hidden} placeholder="Search on Comfort_fit" button="Search" />
          </div>
        </div>
      </div>
    </div>
  );
}
