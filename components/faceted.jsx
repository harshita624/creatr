import React,{useMemo} from "react"
import { useSearchParams } from "react-router-dom"

const CATEGORIES = [
    "Electronics",
    "Clothing",
    "Books",
    "Home"
];

const BRANDS = [
    "BrandA",
    "BrandB",
    "BrandC"
];

const SORT_OPTIONS = [
    "price_asc",
    "price_desc",
    "newest"
];

function Faceted()
{
    const [searchParams,setSearchParams]=useSearchParams()
    const filters=useMemo(()=>{
         return{
            category:searchParams.get("category")||"",
            maxPrice:searchParams.get("maxPrice")||"",
            brands:searchParams.getAll("brand")||[],
            sort:searchParams.get("sort")||"",

         }
    },[searchParams])

    function update(key,value)
    {
        const params=new URLSearchParams(searchParams)
        if(Array.isArray(value))
        {
            params.delete(key)
            value.forEach(item=>{
                params.append(key,item)
            })
        }
        else if(value)
        {
            params.set(key,value)
        }
        else{
            params.delete(key)
        }
        setSearchParams(params,{replace:true})
    }

    function updateBrand(brand)
    {
        let brands=[...filters.brands]
        if(brands.includes(brand))
        {
            brands=brands.filter(b=>b!==brand)
        }
        else{
            brands.push(brand)
        }
        update("brand",brands)
    }
    function reset()
    {
        setSearchParams({})
    }
    return(
        <div>
            <button onClick={reset} >Clear All</button>
            <select value={filters.category} onChange={(e)=>update("category",e.target.value)} >
                  {CATEGORIES.map(category=>(
                    <option key={category} value={category}>{category}</option>
                  ))}
            </select>

            {BRANDS.map(brand=>(
                <label key={brand} >
                    <input key={brand} checked={filters.brands.includes(brand)} onChange={()=>updateBrand(brand)} />
                </label>
            ))}

            <input value={filters.maxPrice} type="range" min="10" max="100" onChange={(e)=>update("maxPrice",e.target.value)}/>
            <h2>Sort</h2>
            <select value={filters.sort} onChange={(e)=>update("sort",e.target.value)}>
                {SORT_OPTIONS.map(sort=>(
                    <option key={sort} value={sort}>{sort}</option>
                ))}

            </select>
        </div>
    )
}