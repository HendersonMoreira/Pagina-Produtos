document.addEventListener('DOMContentLoaded', ()=>{
	const cards = document.querySelectorAll('.product-card')
	cards.forEach(card=>{
		// ====== Variants setup ======
		const variantsScript = card.querySelector('.variants')
		let variants = {}
		if(variantsScript){
			try{ variants = JSON.parse(variantsScript.textContent) }catch(e){ variants = {} }
		}

		// fallback to global `window.productVariants` if not provided inline
		if((!variants || Object.keys(variants).length === 0) && window.productVariants){
			const vKey = card.dataset.variantKey
			if(vKey && window.productVariants[vKey]){
				variants = window.productVariants[vKey]
			} else {
				// if `productVariants` is nested by category, pick the first category as fallback
				const topKeys = Object.keys(window.productVariants)
				if(topKeys.length && window.productVariants[topKeys[0]] && Object.keys(window.productVariants[topKeys[0]]).some(k=>k.includes('|'))){
					variants = window.productVariants[topKeys[0]]
				} else {
					// legacy: flat object
					variants = window.productVariants
				}
			}
		}

		// If variants is a flat object (keys like "Model|Color") and a filter is provided,
		// keep only keys that include the filter substring (case-insensitive).
		const vFilter = card.dataset.variantFilter
		if(vFilter && variants && Object.keys(variants).some(k=>k.includes('|'))){
			// support multiple comma-separated filters, match if any filter appears in the key
			const filters = vFilter.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
			if(filters.length){
				const filtered = {}
				Object.keys(variants).forEach(k=>{
					const keyLower = k.toLowerCase()
					if(filters.some(f=>keyLower.includes(f))) filtered[k] = variants[k]
				})
				variants = filtered
			}
		}

		const keys = Object.keys(variants)
		const models = [...new Set(keys.map(k=>k.split('|')[0]))]
		const colors = [...new Set(keys.map(k=>k.split('|')[1]))]

		const modelSelect = card.querySelector('.select-model')
		const colorSelect = card.querySelector('.select-color')

		const populate = (select, items)=>{
			if(!select) return
			select.innerHTML = ''
			items.forEach(i=>{
				const opt = document.createElement('option')
				opt.value = i
				opt.textContent = i
				select.appendChild(opt)
			})
		}

		if(models.length) populate(modelSelect, models)
		if(colors.length) populate(colorSelect, colors)

		// fallback para cards sem variantes cadastradas
		if(!models.length && modelSelect){
			populate(modelSelect, [card.dataset.defaultModel || 'Consulte no WhatsApp'])
		}
		if(!colors.length && colorSelect){
			populate(colorSelect, [card.dataset.defaultColor || 'Sortida'])
		}

		const applyVariant = (model, color)=>{
			const key = `${model}|${color}`
			let v = variants[key]
			if(!v){
				const k1 = keys.find(k=>k.startsWith(model+'|'))
				const k2 = keys.find(k=>k.endsWith('|'+color))
				v = variants[k1] || variants[k2]
			}
			if(v){
				const img = card.querySelector('.product-image')
				if(img && v.image) img.src = v.image
				const priceEl = card.querySelector('.product-price')
				if(priceEl && v.price) priceEl.textContent = 'R$ ' + v.price.replace('.', ',')
				if(v.price) card.dataset.price = v.price
				card.dataset.product = v.label || `${card.querySelector('.product-name')?.textContent} - ${model} ${color}`
			}
		}

		// initial selection
		if(modelSelect && colorSelect){
			let initialModel = modelSelect.options[0]?.value
			let initialColor = colorSelect.options[0]?.value
			if(keys.length){
				const parts = keys[0].split('|')
				initialModel = parts[0] || initialModel
				initialColor = parts[1] || initialColor
			}
			modelSelect.value = initialModel
			colorSelect.value = initialColor
			applyVariant(initialModel, initialColor)

			modelSelect.addEventListener('change', ()=> applyVariant(modelSelect.value, colorSelect.value))
			colorSelect.addEventListener('change', ()=> applyVariant(modelSelect.value, colorSelect.value))
		}

		// ====== WhatsApp button (inclui a seleção atual no produto) ======
		const btn = card.querySelector('.whatsapp-btn')
		if(!btn) return
		btn.addEventListener('click', ()=>{
			const product = card.dataset.product || card.querySelector('.product-name')?.textContent || ''
			const price = card.dataset.price || card.querySelector('.product-price')?.textContent || ''
			const phoneRaw = card.dataset.phone || ''
			const phone = phoneRaw.replace(/[^0-9]/g,'')
			if(!phone){
				alert('Número do WhatsApp não configurado. Edite o atributo data-phone no card.')
				return
			}
			showToast()
			const message = `Olá! Quero encomendar: ${product} - R$ ${price}`
			const encoded = encodeURIComponent(message)
			const url = `https://wa.me/${phone}?text=${encoded}`
			setTimeout(() => window.open(url, '_blank'), 800)
		})
	})

	// ====== Filtros ======
	document.querySelectorAll('.filter-btn').forEach(btn => {
		btn.addEventListener('click', function () {
			const cat = this.dataset.cat
			document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
			this.classList.add('active')
			document.querySelectorAll('.product-card').forEach(card => {
				if (cat === 'all' || card.dataset.category === cat) {
					card.style.display = ''
					setTimeout(() => {
						card.style.opacity = '1'
						card.style.transform = ''
					}, 10)
				} else {
					card.style.opacity = '0'
					card.style.transform = 'translateY(16px)'
					setTimeout(() => { card.style.display = 'none' }, 300)
				}
			})
		})
	})

	// ====== Animação de entrada ao rolar ======
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.style.opacity = '1'
				entry.target.style.transform = ''
			}
		})
	}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

	document.querySelectorAll('.product-card').forEach(el => {
		el.style.opacity = '0'
		el.style.transform = 'translateY(30px)'
		el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
		observer.observe(el)
	})

	// ====== Parallax no header ======
	window.addEventListener('scroll', () => {
		const scrolled = window.pageYOffset
		const headerEl = document.querySelector('header')
		if (headerEl) headerEl.style.transform = `translateY(${scrolled * 0.45}px)`
	})
})

// ====== Toast ======
function showToast() {
	const toast = document.getElementById('toast')
	if (!toast) return
	toast.classList.add('show')
	setTimeout(() => toast.classList.remove('show'), 3000)
}
