import React ,{useState,useEffect} from "react"
const items=["itemA","itemB","itemC","itemD"]

function Wishlist()
{
    const [wishlist,setWishlist]=useState(()=>{
        const saved=localStorage.get("wishlist")
        return saved?JSON.parse(saved):[]
    })
    const [toast,setToast]=useState("")
    const [search,setSearch]=useState("")
    useEffect(()=>{
        localStorage.setItem("wishlist",JSON.stringify(wishlist))
    },[wishlist])
    function toggle(item)
    {
        if(wishlist.includes(item))
        {
            setWishlist(wishlist.filter(wish=>wish!==item))
            setToast("Item removed")
        }
        else{
            setWishlist([...wishlist,item])
            setToast("Item added")
        }

        setTimeout(()=>{
            setToast("")
        },2500)
    }
    function clear()
    {
        setWishlist([])
        setToast("Wishlist cleared")
    }
    const filtered=items.map(item=>item.toLowerCase().includes(search.toLowerCase()))
    return(
        <div>
            <input type="text" placeholder="Search item"  value={search} onChange={(e)=>setSearch(e.target.value)} />

            {filtered.map((item)=>(
                <div key={item}>
                    <button onClick={()=>toggle(item)} >{wishlist.includes(item)?"Saved":"Save"}</button>
                </div>
            ))}

            {wishlist.length>0 && <button onClick={clear} >Clear wishlist</button>}

            {toast && <p>{toast}</p>}
        </div>
    )
}